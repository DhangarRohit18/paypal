import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';
import { getOrCreateCart } from '../services/cartService.js';
import { evaluateFairPrice } from '../services/fairPriceService.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = store.getUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  // 1. Recent missions
  const recentMissions = Array.from(store.missions.values())
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // 2. Active agents from DB
  const activeAgents = store.getAgentsByUserId(userId);

  // 3. Saved products
  const savedIds = store.getSavedProductIds(userId);
  const savedProducts = savedIds
    .map(id => store.getProductById(id))
    .filter(Boolean);

  // 4. Recommendations (Curated verified non-malicious items with fair price evaluation)
  const recommendations = store.products
    .filter(p => !p.isMaliciousSample && p.availability !== 'out_of_stock')
    .slice(0, 4)
    .map(p => ({
      ...p,
      fairPrice: evaluateFairPrice(p)
    }));

  // 5. Spending Summary (Real numbers from DB)
  const policy = store.getSpendingPolicy(userId);
  const cart = getOrCreateCart(userId);
  const userOrders = Array.from(store.orders.values()).filter(o => o.userId === userId);
  const totalSpentAllTime = Math.round(
    userOrders.reduce((sum, o) => sum + o.totalAmount, 0) * 100
  ) / 100;

  const spendingSummary = {
    totalBudget: policy.totalBudget,
    currentCartValue: cart.total,
    remainingBudget: Math.max(0, Math.round((policy.totalBudget - cart.total) * 100) / 100),
    maxCartValue: policy.maxCartValue,
    maxPricePerItem: policy.maxPricePerItem,
    totalSpentAllTime,
    killSwitchActive: policy.killSwitchActive,
    requireCoApprovalAboveAmount: policy.requireCoApprovalAboveAmount
  };

  // 6. Pending Approvals
  const pendingApprovals = Array.from(store.passports.values())
    .filter(
      p =>
        p.userId === userId &&
        (p.approvalStatus === 'draft' ||
          p.approvalStatus === 'pending_approval' ||
          p.approvalStatus === 'DRAFT' ||
          p.approvalStatus === 'CO_APPROVAL_PENDING')
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 7. Recent Orders
  const recentOrders = userOrders
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
    .slice(0, 5);

  // 8. Security Notifications
  const securityNotifications = store.securityEvents.slice(0, 5);

  res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role
    },
    recentMissions,
    activeAgents,
    savedProducts,
    recommendations,
    spendingSummary,
    pendingApprovals,
    recentOrders,
    securityNotifications
  });
});

router.post('/saved-products/toggle', (req: AuthRequest, res) => {
  const { productId } = req.body;
  if (!productId) {
    res.status(400).json({ error: 'PRODUCT_ID_REQUIRED' });
    return;
  }

  const isSaved = store.toggleSaveProduct(req.userId!, productId);
  res.json({
    success: true,
    isSaved,
    savedProductIds: store.getSavedProductIds(req.userId!)
  });
});

export const dashboardRouter = router;

