import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  getOrCreateCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart
} from '../services/cartService.js';
import { generateSecondOpinion } from '../services/secondOpinionService.js';
import { store } from '../db/inMemoryStore.js';
import { spendingGuard } from '../services/spendingGuard.js';

const router = Router();
router.use(requireAuth);

const AddItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1).default(1)
});

const UpdateItemSchema = z.object({
  quantity: z.number().int().min(0)
});

// ----------------------------------------------------------------------------
// GET /api/cart — Retrieve authenticated user's cart & live policy guard
// ----------------------------------------------------------------------------
router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const cart = getOrCreateCart(userId);
  const policy = store.getSpendingPolicy(userId);
  const guard = spendingGuard.validate(cart, policy);
  const secondOpinion = cart.items.length > 0 ? generateSecondOpinion(cart) : null;

  res.json({
    success: true,
    cart,
    spendingGuard: {
      allowed: guard.allowed,
      reasons: guard.violations,
      violations: guard.violations,
      suggestedFixes: guard.suggestedFixes
    },
    secondOpinion,
    policySummary: {
      totalBudget: policy.totalBudget,
      maxCartValue: policy.maxCartValue,
      maxPricePerItem: policy.maxPricePerItem,
      remainingBudget: Math.max(0, policy.totalBudget - cart.total),
      killSwitchActive: policy.killSwitchActive
    }
  });
});

// ----------------------------------------------------------------------------
// POST /api/cart/items (and POST /api/cart/add) — Add item to cart
// ----------------------------------------------------------------------------
const handleAddItem = (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  const { productId, quantity } = parsed.data;
  // NOTE: Any client-provided prices/totals in req.body are strictly ignored.
  // Prices are drawn authoritatively from verified DB records in cartService.
  const result = addToCart(userId, productId, quantity);

  if (result.error) {
    res.status(400).json({
      error: result.error,
      reasons: result.reasons || result.violations,
      violations: result.violations,
      suggestedFixes: result.suggestedFixes
    });
    return;
  }

  res.json({ success: true, cart: result.cart });
};

router.post('/items', handleAddItem);
router.post('/add', handleAddItem);

// ----------------------------------------------------------------------------
// PATCH /api/cart/items/:id (and POST /api/cart/update) — Update item quantity
// ----------------------------------------------------------------------------
router.patch('/items/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const parsed = UpdateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  const productId = req.params.id;
  const { quantity } = parsed.data;
  const result = updateCartQuantity(userId, productId, quantity);

  if (result.error) {
    res.status(400).json({
      error: result.error,
      reasons: result.reasons || result.violations,
      violations: result.violations,
      suggestedFixes: result.suggestedFixes
    });
    return;
  }

  res.json({ success: true, cart: result.cart });
});

router.post('/update', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const parsed = z.object({ productId: z.string(), quantity: z.number().int().min(0) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  const { productId, quantity } = parsed.data;
  const result = updateCartQuantity(userId, productId, quantity);

  if (result.error) {
    res.status(400).json({
      error: result.error,
      reasons: result.reasons || result.violations,
      violations: result.violations,
      suggestedFixes: result.suggestedFixes
    });
    return;
  }

  res.json({ success: true, cart: result.cart });
});

// ----------------------------------------------------------------------------
// DELETE /api/cart/items/:id (and POST /api/cart/remove) — Remove item
// ----------------------------------------------------------------------------
router.delete('/items/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const productId = req.params.id;
  const result = removeFromCart(userId, productId);
  res.json({ success: true, cart: result.cart });
});

router.post('/remove', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const { productId } = req.body;
  if (!productId) {
    res.status(400).json({ error: 'PRODUCT_ID_REQUIRED' });
    return;
  }

  const result = removeFromCart(userId, productId);
  res.json({ success: true, cart: result.cart });
});

// ----------------------------------------------------------------------------
// DELETE /api/cart — Clear cart
// ----------------------------------------------------------------------------
router.delete('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const emptyCart = clearCart(userId);
  res.json({ success: true, cart: emptyCart });
});

export const cartRouter = router;
