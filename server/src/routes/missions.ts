import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';
import { optimizeBundles } from '../services/bundleOptimizer.js';
import { addToCart, clearCart } from '../services/cartService.js';
import { IMission } from '../../../shared/types.js';

const router = Router();
router.use(requireAuth);

const CreateMissionSchema = z.object({
  goal: z.string().min(3),
  targetBudget: z.number().positive(),
  categoriesNeeded: z.array(z.string()).optional(),
  preferredBrands: z.array(z.string()).optional()
});

router.get('/presets', (req, res) => {
  const presets = [
    {
      goal: 'AI Developer Workstation under $1,500',
      targetBudget: 1500,
      description: 'High-RAM compute laptop, 4K USB-C monitor, and mechanical input peripherals for machine learning workflows.'
    },
    {
      goal: 'Executive Home Office under $1,000',
      targetBudget: 1000,
      description: 'Ultra-lightweight notebook, eye-care monitor, silent keyboard, and ergonomic pointer.'
    },
    {
      goal: 'Gaming & Content Creation Rig under $1,800',
      targetBudget: 1800,
      description: 'High-refresh gaming machine, fast-response display, featherweight mouse, and creator camera.'
    }
  ];
  res.json({ presets });
});

router.post('/create', (req: AuthRequest, res) => {
  const parsed = CreateMissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const { goal, targetBudget, categoriesNeeded, preferredBrands } = parsed.data;

  // Run deterministic bundle optimizer (No AI arithmetic)
  const plans = optimizeBundles({
    goal,
    targetBudget,
    categoriesNeeded,
    preferredBrands
  });

  const mission: IMission = {
    id: uuidv4(),
    userId: req.userId!,
    goal,
    targetBudget,
    status: 'plans_ready',
    understoodRequirements: {
      categories: [],
      budget: { amount: targetBudget, currency: 'USD' },
      budgetLimit: targetBudget,
      specs: {},
      requiredSpecs: {},
      brandsInclude: preferredBrands || [],
      preferredBrands: preferredBrands || [],
      brandsExclude: [],
      excludedBrands: [],
      intendedUse: goal,
      targetUse: goal,
      excludedProducts: [],
      missingInfo: [],
      mustHaveFeatures: [],
      clarifyingQuestion: null
    },
    plans,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.missions.set(mission.id, mission);

  res.status(201).json({
    success: true,
    mission
  });
});

router.get('/:id', (req: AuthRequest, res) => {
  const mission = store.missions.get(req.params.id);
  if (!mission) {
    res.status(404).json({ error: 'MISSION_NOT_FOUND' });
    return;
  }
  res.json({ mission });
});

router.post('/:id/select-plan', (req: AuthRequest, res) => {
  const { planId } = req.body;
  const mission = store.missions.get(req.params.id);
  if (!mission) {
    res.status(404).json({ error: 'MISSION_NOT_FOUND' });
    return;
  }

  const plan = mission.plans.find(p => p.planId === planId);
  if (!plan) {
    res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    return;
  }

  // Clear current cart and load plan items
  clearCart(req.userId!);

  const addedItems = [];
  const errors = [];

  for (const item of plan.items) {
    const result = addToCart(req.userId!, item.product.id, item.quantity);
    if (result.cart) {
      addedItems.push(item.product.id);
    } else {
      errors.push({ productId: item.product.id, error: result.error, reasons: result.reasons });
    }
  }

  mission.selectedPlanId = planId;
  mission.status = 'cart_proposed';
  mission.updatedAt = new Date().toISOString();
  store.missions.set(mission.id, mission);

  res.json({
    success: true,
    mission,
    addedItemCount: addedItems.length,
    errors
  });
});

export const missionsRouter = router;

