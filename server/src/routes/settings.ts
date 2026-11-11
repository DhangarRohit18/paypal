import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = store.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  const policy = store.getSpendingPolicy(userId);
  const memory = store.getMemoryProfile(userId);
  const agents = store.getAgentsByUserId(userId);

  res.json({
    profile: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    spendingPolicy: policy,
    memoryProfile: memory,
    agents
  });
});

const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional()
});

router.put('/profile', (req: AuthRequest, res) => {
  const parsed = ProfileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const user = store.getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  if (parsed.data.name) {
    user.name = parsed.data.name;
    store.users.set(user.userId, user);
  }

  res.json({
    success: true,
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

const PolicyUpdateSchema = z.object({
  totalBudget: z.number().positive(),
  maxPricePerItem: z.number().positive(),
  maxCartValue: z.number().positive(),
  maxQuantityPerItem: z.number().int().min(1).max(20),
  requireCoApprovalAboveAmount: z.number().positive(),
  restrictedCategories: z.array(z.string()).default([])
});

router.put('/policy', (req: AuthRequest, res) => {
  const parsed = PolicyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const current = store.getSpendingPolicy(req.userId!);
  const updated = {
    ...current,
    ...parsed.data
  };

  store.spendingPolicies.set(req.userId!, updated);

  res.json({
    success: true,
    spendingPolicy: updated
  });
});

const MemoryUpdateSchema = z.object({
  personalizationEnabled: z.boolean(),
  preferredCategories: z.array(z.string()).optional(),
  brandAffinities: z.array(z.string()).optional()
});

router.put('/memory', (req: AuthRequest, res) => {
  const parsed = MemoryUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const current = store.getMemoryProfile(req.userId!);
  const updated = {
    ...current,
    personalizationEnabled: parsed.data.personalizationEnabled,
    preferredCategories: parsed.data.preferredCategories ?? current.preferredCategories,
    brandAffinities: parsed.data.brandAffinities ?? current.brandAffinities,
    updatedAt: new Date().toISOString()
  };

  store.memoryProfiles.set(req.userId!, updated);

  res.json({
    success: true,
    memoryProfile: updated
  });
});

export const settingsRouter = router;

