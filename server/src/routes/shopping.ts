import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { chatRateLimiter } from '../middleware/rateLimiter.js';
import { toolGateway } from '../aegis/toolGateway.js';
import { searchProducts } from '../services/discovery.js';
import { executeShoppingTurn } from '../agents/orchestrator.js';
import { store } from '../db/inMemoryStore.js';

const router = Router();
router.use(requireAuth);

// ----------------------------------------------------------------------------
// 1. POST /api/shopping/search - Deterministic Catalogue Search Choke Point
// ----------------------------------------------------------------------------
const SearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  brand: z.string().optional(),
  brandsInclude: z.array(z.string()).optional(),
  brandsExclude: z.array(z.string()).optional(),
  specs: z.record(z.any()).optional(),
  specConstraints: z.record(z.any()).optional(),
  inStockOnly: z.boolean().optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'rating']).optional(),
  limit: z.number().min(1).max(100).optional()
});

router.post('/search', async (req: AuthRequest, res: Response) => {
  const parseResult = SearchSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'INVALID_SEARCH_PARAMETERS',
      details: parseResult.error.flatten()
    });
    return;
  }

  const filters = parseResult.data;
  const userId = req.userId || req.user?.userId || 'usr-demo-shopper-001';

  const result = await toolGateway.executeTool(
    {
      userId,
      agentId: 'discovery-tool',
      toolName: 'searchProducts',
      params: filters
    },
    (params) => searchProducts(params)
  );

  if (!result.success) {
    res.status(403).json({
      error: 'SEARCH_TOOL_EXECUTION_DENIED',
      message: result.error
    });
    return;
  }

  res.json({
    success: true,
    count: (result.result as any[]).length,
    products: result.result
  });
});

// ----------------------------------------------------------------------------
// 2. POST /api/shopping/chat - SSE Streaming Chat Endpoint
// ----------------------------------------------------------------------------
const ChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  updatedRequirements: z.record(z.any()).optional()
});

router.post('/chat', chatRateLimiter, async (req: AuthRequest, res: Response) => {
  const parseResult = ChatSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'INVALID_CHAT_PAYLOAD',
      details: parseResult.error.flatten()
    });
    return;
  }

  const { message, conversationId, updatedRequirements } = parseResult.data;
  const userId = req.userId || req.user?.userId || 'usr-demo-shopper-001';
  const isSseRequested =
    req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (isSseRequested) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await executeShoppingTurn({
        userId,
        conversationId,
        message,
        updatedRequirements: updatedRequirements as any,
        onEvent: sendEvent
      });
      res.end();
    } catch (err: any) {
      console.error('[SHOPPING_CHAT_STREAM_ERROR]', err);
      sendEvent('error', { message: err.message || 'Stream processing failed' });
      res.end();
    }
  } else {
    // Standard JSON Response (Used by tests & non-streaming clients)
    try {
      const result = await executeShoppingTurn({
        userId,
        conversationId,
        message,
        updatedRequirements: updatedRequirements as any
      });

      res.json({
        success: true,
        conversationId: result.conversationId,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
        understoodRequirements: result.understoodRequirements,
        products: result.products,
        mode: result.mode,
        clarifyingQuestion: result.clarifyingQuestion,
        securityBlocked: result.securityBlocked
      });
    } catch (err: any) {
      console.error('[SHOPPING_CHAT_ERROR]', err);
      res.status(500).json({
        error: 'CHAT_PROCESSING_FAILED',
        message: err.message || 'An unexpected error occurred during chat processing.'
      });
    }
  }
});

// ----------------------------------------------------------------------------
// 3. Conversation Management (User-Scoped)
// ----------------------------------------------------------------------------
router.get('/conversations', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId || '';
  const conversations = store.getConversationsByUserId(userId);
  res.json({
    success: true,
    conversations
  });
});

router.get('/conversations/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId || '';
  const conv = store.getConversationById(req.params.id);
  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
    return;
  }
  res.json({ success: true, conversation: conv });
});

router.delete('/conversations/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId || '';
  const conv = store.getConversationById(req.params.id);
  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
    return;
  }
  store.deleteConversation(req.params.id);
  res.json({ success: true, message: 'Conversation deleted.' });
});

router.patch('/conversations/:id/requirements', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId || '';
  const conv = store.getConversationById(req.params.id);
  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
    return;
  }

  const updatedReqs = req.body;
  conv.understoodRequirements = {
    ...conv.understoodRequirements,
    ...updatedReqs,
    updatedAt: new Date().toISOString()
  };
  conv.updatedAt = new Date().toISOString();
  store.saveConversation(conv);

  res.json({
    success: true,
    understoodRequirements: conv.understoodRequirements
  });
});

export const shoppingRouter = router;
