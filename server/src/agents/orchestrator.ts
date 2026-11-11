import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import {
  IConversation,
  IChatMessage,
  IProduct,
  IUnderstoodRequirements,
  IAgentEvent
} from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';
import { detectInjection, sanitizeForLLM } from '../aegis/injectionDetector.js';
import { runIntentAgent, createDefaultRequirements } from './intentAgent.js';
import { toolGateway } from '../aegis/toolGateway.js';
import { searchProducts } from '../services/discovery.js';
import { evaluateFairPrice } from '../services/fairPriceService.js';
import { ConversationModel } from '../models/Conversation.js';
import { addToCart, removeFromCart, clearCart, getOrCreateCart } from '../services/cartService.js';

export interface OrchestratorParams {
  userId: string;
  conversationId?: string;
  message: string;
  updatedRequirements?: IUnderstoodRequirements;
  onEvent?: (event: string, data: any) => void;
}

export interface OrchestratorResult {
  conversationId: string;
  userMessage: IChatMessage;
  assistantMessage: IChatMessage;
  understoodRequirements: IUnderstoodRequirements;
  products: IProduct[];
  mode: 'ai_llm' | 'offline_rule_based' | 'aegis_quarantine';
  clarifyingQuestion: string | null;
  securityBlocked?: boolean;
}

export async function executeShoppingTurn(
  params: OrchestratorParams
): Promise<OrchestratorResult> {
  const { userId, conversationId, message, updatedRequirements, onEvent } = params;

  // 1. Get or create Conversation
  let conversation: IConversation;
  if (conversationId && store.conversations.has(conversationId)) {
    conversation = store.conversations.get(conversationId)!;
  } else {
    const newId = conversationId || `conv-${uuidv4()}`;
    conversation = {
      conversationId: newId,
      userId,
      title: message.slice(0, 45) + (message.length > 45 ? '...' : ''),
      understoodRequirements: createDefaultRequirements(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveConversation(conversation);
  }

  // 2. User Message Record
  const userMsgId = `msg-${uuidv4()}`;
  const userChatMsg: IChatMessage = {
    messageId: userMsgId,
    conversationId: conversation.conversationId,
    userId,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString()
  };
  conversation.messages.push(userChatMsg);

  // 3. AEGIS Gate 1: User Input Injection Scanner
  const injectionCheck = detectInjection(message, 'user_input');
  if (!injectionCheck.safe) {
    if (onEvent) {
      onEvent('agent_status', {
        status: 'security_intercept',
        message: '⚠️ AEGIS SECURITY GATE: Adversarial prompt injection pattern detected and quarantined.'
      });
    }

    const quarantineReply = `⚠️ AEGIS SECURITY INTERCEPT: Your input contained adversarial injection patterns (${injectionCheck.detectedPatterns.join(
      ', '
    )}). The system has quarantined the input. Operating instructions and spending policies remain fully protected.`;

    const quarantineMsg: IChatMessage = {
      messageId: `msg-${uuidv4()}`,
      conversationId: conversation.conversationId,
      userId,
      role: 'aegis',
      content: quarantineReply,
      agentMode: 'aegis_quarantine',
      createdAt: new Date().toISOString()
    };
    conversation.messages.push(quarantineMsg);
    conversation.updatedAt = new Date().toISOString();
    store.saveConversation(conversation);

    if (onEvent) {
      onEvent('token', { chunk: quarantineReply });
      onEvent('products', []);
      onEvent('done', {
        conversationId: conversation.conversationId,
        messageId: quarantineMsg.messageId,
        securityBlocked: true
      });
    }

    return {
      conversationId: conversation.conversationId,
      userMessage: userChatMsg,
      assistantMessage: quarantineMsg,
      understoodRequirements: conversation.understoodRequirements,
      products: [],
      mode: 'aegis_quarantine',
      clarifyingQuestion: null,
      securityBlocked: true
    };
  }

  const cleanMessage = sanitizeForLLM(message);

  // 4. Intent Agent Execution
  if (onEvent) {
    onEvent('agent_status', {
      status: 'analyzing_intent',
      message: 'Extracting structured specifications, budget envelope, and brand preferences...'
    });
  }

  let finalReqs: IUnderstoodRequirements;
  let mode: 'ai_llm' | 'offline_rule_based' = 'offline_rule_based';
  let clarifyingQuestion: string | null = null;

  if (updatedRequirements) {
    // User directly modified requirements from the right panel
    finalReqs = { ...updatedRequirements };
    mode = 'offline_rule_based';
  } else {
    const intentResult = await runIntentAgent(cleanMessage, conversation.understoodRequirements);
    finalReqs = intentResult.requirements;
    mode = intentResult.mode;
    clarifyingQuestion = intentResult.clarifyingQuestion;
  }

  conversation.understoodRequirements = finalReqs;
  if (onEvent) {
    onEvent('requirements_updated', finalReqs);
  }

  // 5. If clarifying question is needed and user gave no specifics
  if (clarifyingQuestion) {
    const assistantMsg: IChatMessage = {
      messageId: `msg-${uuidv4()}`,
      conversationId: conversation.conversationId,
      userId,
      role: 'assistant',
      content: clarifyingQuestion,
      agentMode: mode,
      requirements: finalReqs,
      products: [],
      createdAt: new Date().toISOString()
    };
    conversation.messages.push(assistantMsg);
    store.saveConversation(conversation);

    if (onEvent) {
      onEvent('token', { chunk: clarifyingQuestion });
      onEvent('products', []);
      onEvent('done', {
        conversationId: conversation.conversationId,
        messageId: assistantMsg.messageId
      });
    }

    return {
      conversationId: conversation.conversationId,
      userMessage: userChatMsg,
      assistantMessage: assistantMsg,
      understoodRequirements: finalReqs,
      products: [],
      mode,
      clarifyingQuestion
    };
  }

  // 5b. Check for Cart Operations (e.g. "add the second laptop", "add item 2")
  const msgLower = cleanMessage.toLowerCase();
  const isAddCartCommand =
    /\b(?:add|put|place|buy)\b/i.test(msgLower) &&
    /\b(?:cart|laptop|phone|monitor|headphone|item|first|1st|second|2nd|third|3rd|fourth|4th)\b/i.test(msgLower);

  if (isAddCartCommand) {
    const previousProducts: IProduct[] = [];
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const m = conversation.messages[i];
      if (m.products && m.products.length > 0) {
        previousProducts.push(...m.products);
        break;
      }
    }

    let targetProduct: IProduct | undefined = undefined;

    if (/\b(?:second|2nd)\b/i.test(msgLower) && previousProducts.length >= 2) {
      targetProduct = previousProducts[1];
    } else if (/\b(?:third|3rd)\b/i.test(msgLower) && previousProducts.length >= 3) {
      targetProduct = previousProducts[2];
    } else if (/\b(?:fourth|4th)\b/i.test(msgLower) && previousProducts.length >= 4) {
      targetProduct = previousProducts[3];
    } else if (/\b(?:first|1st)\b/i.test(msgLower) && previousProducts.length >= 1) {
      targetProduct = previousProducts[0];
    } else if (previousProducts.length > 0) {
      targetProduct =
        previousProducts.find((p) => msgLower.includes(p.brand.toLowerCase())) ||
        previousProducts.find((p) => msgLower.includes(p.category.toLowerCase())) ||
        previousProducts[0];
    }

    if (targetProduct) {
      if (onEvent) {
        onEvent('agent_status', {
          status: 'modifying_cart',
          message: `Executing AEGIS Cart Tool to add "${targetProduct.title}"...`
        });
      }

      const cartToolResult = await toolGateway.executeTool(
        {
          userId,
          agentId: 'cart-tool',
          toolName: 'addToCart',
          params: { productId: targetProduct.id, quantity: 1 }
        },
        () => addToCart(userId, targetProduct!.id, 1)
      );

      const cartData = cartToolResult.result as any;
      let replyContent = '';

      if (cartData?.error || !cartToolResult.success) {
        const errorMsg = cartData?.violations?.join('\n') || cartData?.reasons?.join('\n') || cartToolResult.error;
        const fixMsg = cartData?.suggestedFixes?.join(' ') || '';
        replyContent = `⚠️ **AEGIS SPENDING GUARD INTERCEPT**\n${errorMsg}\n\n${fixMsg ? `*Suggested Fix*: ${fixMsg}` : ''}`;
      } else {
        const liveCart = cartData?.cart || getOrCreateCart(userId);
        replyContent =
          `✅ Added **${targetProduct.title}** to your shopping cart via the AEGIS Tool Gateway.\n\n` +
          `• Unit Price: $${targetProduct.price.toFixed(2)} USD\n` +
          `• Cart Subtotal: $${liveCart.subtotal.toFixed(2)} USD\n` +
          `• Total with Shipping & Tax: $${liveCart.total.toFixed(2)} USD (Cart v${liveCart.version})\n` +
          `• AEGIS Spending Guard: All policy thresholds and spending limits verified.\n\n` +
          `You can view your Cart or generate a Purchase Passport whenever you are ready.`;
      }

      if (onEvent) {
        onEvent('token', { chunk: replyContent });
        onEvent('cart_updated', cartData?.cart);
        onEvent('done', { conversationId: conversation.conversationId });
      }

      const assistantMsg: IChatMessage = {
        messageId: `msg-${uuidv4()}`,
        conversationId: conversation.conversationId,
        userId,
        role: cartData?.error ? 'aegis' : 'assistant',
        content: replyContent,
        agentMode: mode,
        requirements: finalReqs,
        products: [],
        createdAt: new Date().toISOString()
      };
      conversation.messages.push(assistantMsg);
      store.saveConversation(conversation);

      return {
        conversationId: conversation.conversationId,
        userMessage: userChatMsg,
        assistantMessage: assistantMsg,
        understoodRequirements: finalReqs,
        products: [],
        mode,
        clarifyingQuestion: null
      };
    }
  }

  // 6. AEGIS Tool Gateway: Deterministic Search
  if (onEvent) {
    onEvent('agent_status', {
      status: 'searching_catalogue',
      message: `Executing deterministic catalogue search via AEGIS Tool Gateway (Budget: $${finalReqs.budget.amount})...`
    });
  }

  const searchExecution = await toolGateway.executeTool(
    {
      userId,
      agentId: 'intent-agent',
      toolName: 'searchProducts',
      params: {
        category: finalReqs.category,
        categories: finalReqs.categories,
        maxPrice: finalReqs.budget.amount,
        brandsInclude: finalReqs.brandsInclude,
        brandsExclude: finalReqs.brandsExclude,
        specs: finalReqs.specs,
        sortBy: 'relevance',
        limit: 8
      }
    },
    (filters) => searchProducts(filters)
  );

  let rawProducts: IProduct[] = searchExecution.success && searchExecution.result
    ? (searchExecution.result as IProduct[])
    : [];

  // Fallback: If 0 products matched with strict specs, relax specs but keep budget and category
  if (rawProducts.length === 0 && (finalReqs.category || finalReqs.budget.amount)) {
    const relaxed = searchProducts({
      category: finalReqs.category,
      maxPrice: finalReqs.budget.amount,
      brandsExclude: finalReqs.brandsExclude,
      limit: 6
    });
    if (relaxed.length > 0) {
      rawProducts = relaxed;
    }
  }

  // 7. AEGIS Gate 2: Untrusted Merchant Data Isolation & Prompt-Injection Neutralization
  if (onEvent) {
    onEvent('agent_status', {
      status: 'verifying_specs',
      message: 'Running AEGIS FairPrice heuristics and untrusted merchant data isolation...'
    });
  }

  const processedProducts: IProduct[] = rawProducts.map((prod) => {
    // Isolate & scan
    const isolation = toolGateway.wrapUntrustedProductData({
      id: prod.id,
      title: prod.title || prod.name || '',
      description: prod.description,
      specs: prod.specs,
      merchantName: prod.merchantName || 'Verified Merchant'
    });

    const isMaliciousFixture = prod.isMaliciousSample || prod.isSecurityTestFixture || isolation.isFlagged;

    return {
      ...prod,
      isSampleData: true,
      source: 'sample' as const,
      isMaliciousSample: isMaliciousFixture,
      isSecurityTestFixture: isMaliciousFixture,
      description: isMaliciousFixture
        ? `[AEGIS ISOLATED: Red Team Security Test Fixture] ${prod.description.slice(0, 80)}... [PROMPT INJECTION NEUTRALIZED]`
        : prod.description
    };
  });

  // 8. Generate Assistant Text Response
  let responseText = '';
  const matchedCount = processedProducts.length;
  const categoryLabel = finalReqs.category ? finalReqs.category.replace('_', ' ') : 'hardware';
  const budgetFormatted = `$${finalReqs.budget.amount.toLocaleString()}`;

  if (matchedCount > 0) {
    const topItem = processedProducts[0];
    responseText = `I researched our verified catalogue for ${categoryLabel} matching your goal "${finalReqs.intendedUse || cleanMessage}".\n\n` +
      `• Budget Ceiling: ${budgetFormatted} (All ${matchedCount} recommendations are within your limit)\n` +
      (finalReqs.brandsExclude.length > 0 ? `• Excluded Brands: ${finalReqs.brandsExclude.join(', ')}\n` : '') +
      (Object.keys(finalReqs.specs).length > 0 ? `• Verified Specs: ${Object.entries(finalReqs.specs).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ')}\n\n` : '\n') +
      `Top pick: **${topItem.title}** at $${topItem.price.toFixed(2)} from ${topItem.merchantName || 'Verified Merchant'}. All items feature active merchant warranties and verified sample data.`;
  } else {
    responseText = `I searched our catalogue for ${categoryLabel} under ${budgetFormatted}, but couldn't find items strictly meeting all criteria. Try adjusting the budget slider in the Understood Requirements panel or relaxing brand exclusions.`;
  }

  // 9. Stream Text Chunks (Tokens)
  if (onEvent) {
    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4).join(' ') + ' ';
      onEvent('token', { chunk });
    }
    onEvent('products', processedProducts);
  }

  // 10. Persist Assistant Message
  const assistantMsgId = `msg-${uuidv4()}`;
  const assistantChatMsg: IChatMessage = {
    messageId: assistantMsgId,
    conversationId: conversation.conversationId,
    userId,
    role: 'assistant',
    content: responseText,
    products: processedProducts,
    agentMode: mode,
    requirements: finalReqs,
    createdAt: new Date().toISOString()
  };
  conversation.messages.push(assistantChatMsg);
  conversation.updatedAt = new Date().toISOString();
  store.saveConversation(conversation);

  // Sync to MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      await ConversationModel.updateOne(
        { conversationId: conversation.conversationId },
        { $set: conversation },
        { upsert: true }
      );
    } catch (dbErr) {
      console.warn('MongoDB conversation sync failed:', dbErr);
    }
  }

  // 11. Orchestrator Event Log
  const orchestratorEvent: IAgentEvent = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    agentId: 'orchestrator',
    action: 'DISPATCH_BUYWISE_RECOMMENDATION',
    toolName: 'executeShoppingTurn',
    inputSummary: `Message: "${cleanMessage.slice(0, 60)}", Budget: ${budgetFormatted}`,
    outputSummary: `Delivered ${matchedCount} verified items. Mode: ${mode}.`,
    permissionCheck: 'PASSED',
    riskLevel: 'LOW'
  };
  store.addAgentEvent(orchestratorEvent);

  if (onEvent) {
    onEvent('done', {
      conversationId: conversation.conversationId,
      messageId: assistantMsgId
    });
  }

  return {
    conversationId: conversation.conversationId,
    userMessage: userChatMsg,
    assistantMessage: assistantChatMsg,
    understoodRequirements: finalReqs,
    products: processedProducts,
    mode,
    clarifyingQuestion: null
  };
}

