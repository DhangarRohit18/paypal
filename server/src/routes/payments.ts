import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';
import { verifyApprovalMandate } from '../services/mandateService.js';
import { getOrCreateCart, clearCart } from '../services/cartService.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  isPayPalConfigured
} from '../payments/paypalClient.js';
import { checkCartAgainstPolicy } from '../services/spendingGuard.js';
import { IOrder } from '../../../shared/types.js';

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    configured: isPayPalConfigured(),
    clientId: process.env.PAYPAL_CLIENT_ID || null,
    environment: 'sandbox',
    currency: 'USD'
  });
});

router.post('/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { passportId, approvalId } = req.body;
    if (!passportId || !approvalId) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'passportId and approvalId are required.' });
      return;
    }

    const passport = store.passports.get(passportId);
    if (!passport) {
      res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
      return;
    }

    const cart = getOrCreateCart(req.userId!);

    // AEGIS Security Check 1: Cryptographic mandate verification
    const verification = verifyApprovalMandate(approvalId, cart.version);
    if (!verification.valid) {
      res.status(400).json({
        error: 'MANDATE_INVALID',
        reason: verification.reason,
        message: 'Security validation failed: The approval mandate is invalid, expired, or the cart was modified.'
      });
      return;
    }

    // AEGIS Security Check 2: Policy & Kill switch
    const policy = store.getSpendingPolicy(req.userId!);
    const guard = checkCartAgainstPolicy(cart, policy);
    if (!guard.allowed) {
      res.status(403).json({
        error: 'POLICY_VIOLATION',
        reasons: guard.reasons
      });
      return;
    }

    // Call PayPal Orders v2 REST API (or simulated sandbox if credentials not provided)
    const paypalOrder = await createPayPalOrder({
      idempotencyKey: approvalId,
      finalAmount: passport.priceBreakdown.finalTotal.toFixed(2),
      currency: passport.priceBreakdown.currency,
      passportId,
      items: passport.items.map(i => ({
        name: i.productSnapshot.title,
        quantity: String(i.quantity),
        unitAmount: i.unitPrice.toFixed(2)
      }))
    });

    res.json({
      success: true,
      paypalOrderId: paypalOrder.orderId,
      approveUrl: paypalOrder.approveUrl,
      finalAmount: passport.priceBreakdown.finalTotal.toFixed(2),
      currency: passport.priceBreakdown.currency,
      configured: isPayPalConfigured()
    });
  } catch (err: any) {
    console.error('[PAYPAL_CREATE_ORDER_ERR]', err);
    res.status(500).json({ error: 'PAYPAL_ORDER_CREATION_FAILED', message: err.message });
  }
});

router.post('/capture-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { paypalOrderId, approvalId } = req.body;
    if (!paypalOrderId || !approvalId) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'paypalOrderId and approvalId are required.' });
      return;
    }

    const mandate = store.approvals.get(approvalId);
    if (!mandate) {
      res.status(404).json({ error: 'MANDATE_NOT_FOUND' });
      return;
    }

    if (mandate.usedAt) {
      res.status(400).json({ error: 'MANDATE_ALREADY_USED', message: 'Replay attempt blocked.' });
      return;
    }

    const passport = store.passports.get(mandate.passportId);
    if (!passport) {
      res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
      return;
    }

    // Capture payment
    const captureResult = await capturePayPalOrder(paypalOrderId);

    // Mark mandate used (Single-use enforcement)
    mandate.usedAt = new Date().toISOString();
    store.approvals.set(approvalId, mandate);

    // Update passport
    passport.approvalStatus = 'COMPLETED';
    store.passports.set(passport.passportId, passport);

    // Create Order Record
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
    const now = new Date();
    const returnDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const warrantyEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const newOrder: IOrder = {
      orderId,
      userId: req.userId!,
      passportId: passport.passportId,
      paypalOrderId,
      paypalCaptureId: captureResult.captureId,
      items: passport.items,
      totalAmount: passport.priceBreakdown.finalTotal,
      currency: passport.priceBreakdown.currency,
      status: 'PLACED',
      returnDeadlineDate: returnDeadline.toISOString().split('T')[0],
      warrantyEndDate: warrantyEnd.toISOString().split('T')[0],
      placedAt: now.toISOString()
    };

    store.orders.set(orderId, newOrder);

    // Clear live cart
    clearCart(req.userId!);

    res.json({
      success: true,
      order: newOrder,
      capture: captureResult
    });
  } catch (err: any) {
    console.error('[PAYPAL_CAPTURE_ORDER_ERR]', err);
    res.status(500).json({ error: 'PAYPAL_CAPTURE_FAILED', message: err.message });
  }
});

// Webhook endpoint (Receives PayPal webhook events)
router.post('/webhook', (req, res) => {
  const event = req.body;
  console.log(`[PAYPAL_WEBHOOK] Received event: ${event?.event_type}`);

  if (event?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const customId = event.resource?.custom_id;
    if (customId) {
      const order = Array.from(store.orders.values()).find(o => o.passportId === customId);
      if (order) {
        order.status = 'PROCESSING';
        store.orders.set(order.orderId, order);
      }
    }
  }

  res.status(200).json({ status: 'received' });
});

export const paymentsRouter = router;

