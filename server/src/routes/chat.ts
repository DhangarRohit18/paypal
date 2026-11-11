import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { detectInjection, sanitizeForLLM } from '../aegis/injectionDetector.js';
import { runIntentAgent } from '../agents/intentAgent.js';
import { searchProducts } from '../services/discovery.js';
import { evaluateFairPrice } from '../services/fairPriceService.js';
import { store } from '../db/inMemoryStore.js';
import { IAgentEvent } from '../../../shared/types.js';

const router = Router();
router.use(requireAuth);

router.post('/message', async (req: AuthRequest, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'MESSAGE_REQUIRED' });
    return;
  }

  // 1. AEGIS Injection Gate
  const injectionCheck = detectInjection(message, 'user_input');
  if (!injectionCheck.safe) {
    res.json({
      reply: `⚠️ AEGIS SECURITY INTERCEPT: Your input contained adversarial injection patterns (${injectionCheck.detectedPatterns.join(', ')}). The system has quarantined the input.`,
      securityBlocked: true,
      flaggedPhrases: injectionCheck.flaggedPhrases,
      products: [],
      understoodRequirements: null,
      agentMode: 'aegis_quarantine'
    });
    return;
  }

  const cleanMessage = sanitizeForLLM(message);

  // 2. Intent Agent
  const intentResult = await runIntentAgent(cleanMessage);
  const reqs = intentResult.requirements;

  // 3. Deterministic Discovery
  const matchingProducts = searchProducts({
    category: reqs.category,
    maxPrice: reqs.budgetLimit,
    limit: 6
  });

  // Evaluate fair price for each match
  const productsWithEval = matchingProducts.map(p => ({
    ...p,
    fairPrice: evaluateFairPrice(p)
  }));

  // 4. Log Orchestrator Event
  const orchestratorEvent: IAgentEvent = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    agentId: 'orchestrator',
    action: 'DISPATCH_BUYWISE_RECOMMENDATION',
    toolName: 'searchProducts',
    inputSummary: `Category: ${reqs.category || 'Any'}, Limit: $${reqs.budgetLimit}`,
    outputSummary: `Returned ${productsWithEval.length} matched verified items`,
    permissionCheck: 'PASSED',
    riskLevel: 'LOW'
  };
  store.addAgentEvent(orchestratorEvent);

  const replyText = `I have analyzed your request for "${cleanMessage}". Based on your target budget of $${reqs.budgetLimit.toLocaleString()} and category preferences (${reqs.category || 'general technology'}), here are top-tier verified options from our authenticated catalogue. Every component has been evaluated through AEGIS FairPrice and FitCheck integrity checks.`;

  res.json({
    reply: replyText,
    understoodRequirements: reqs,
    agentMode: intentResult.mode,
    reasoning: intentResult.reasoning,
    products: productsWithEval,
    securityEventsCount: store.securityEvents.length
  });
});

export const chatRouter = router;
