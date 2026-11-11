import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';
import { IResolutionRequest } from '../../../shared/types.js';
import { OrderModel } from '../models/Order.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  let orders = Array.from(store.orders.values())
    .filter((o) => o.userId === req.userId)
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  if (mongoose.connection.readyState === 1) {
    try {
      const dbOrders = await OrderModel.find({ userId: req.userId }).sort({ placedAt: -1 }).lean();
      if (dbOrders && dbOrders.length > 0) {
        orders = dbOrders as any;
      }
    } catch (err) {
      console.warn('Error fetching orders from MongoDB:', err);
    }
  }

  res.json({ orders });
});

router.get('/:id', async (req: AuthRequest, res) => {
  let order = store.orders.get(req.params.id);

  if (!order && mongoose.connection.readyState === 1) {
    try {
      const dbOrder = await OrderModel.findOne({ orderId: req.params.id, userId: req.userId }).lean();
      if (dbOrder) {
        order = dbOrder as any;
      }
    } catch (err) {
      console.warn('Error fetching order from MongoDB:', err);
    }
  }

  if (!order || order.userId !== req.userId) {
    res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return;
  }

  const resolutions = Array.from(store.resolutions.values()).filter(
    (r) => r.orderId === order!.orderId
  );

  res.json({ order, resolutions });
});

router.post('/:id/resolution', (req: AuthRequest, res) => {
  const order = store.orders.get(req.params.id);
  if (!order || order.userId !== req.userId) {
    res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    return;
  }

  const { requestType, reason } = req.body;
  if (!requestType || !reason) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'requestType and reason are required.' });
    return;
  }

  // Check if within return deadline
  const now = new Date();
  const deadline = new Date(order.returnDeadlineDate);
  const isWithinReturnWindow = now <= deadline;

  let guidanceText = '';
  if (requestType === 'RETURN') {
    if (isWithinReturnWindow) {
      guidanceText = `Order ${order.orderId} is currently within the active 30-day merchant return protection window (expires ${order.returnDeadlineDate}). We have drafted an official return RMA manifest for NovaTech and Apex logistics. Free return shipping label pre-authorized.`;
    } else {
      guidanceText = `The standard 30-day return window expired on ${order.returnDeadlineDate}. However, your items remain protected under the active manufacturer hardware warranty through ${order.warrantyEndDate}.`;
    }
  } else if (requestType === 'WARRANTY_CLAIM') {
    guidanceText = `Hardware warranty claim registered for order ${order.orderId}. Your items are covered under direct manufacturer repair/replacement through ${order.warrantyEndDate}.`;
  } else {
    guidanceText = `Policy clarity assessment: All merchants in this order comply with standard consumer dispute resolutions. PayPal Buyer Protection is active for 180 days from purchase.`;
  }

  const resolution: IResolutionRequest = {
    id: uuidv4(),
    orderId: order.orderId,
    userId: req.userId!,
    requestType,
    reason,
    status: 'DRAFT_PREPARED',
    guidanceText,
    createdAt: new Date().toISOString()
  };

  store.resolutions.set(resolution.id, resolution);

  res.json({
    success: true,
    resolution
  });
});

export const ordersRouter = router;

