import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { store } from '../db/inMemoryStore.js';
import { verifyApprovalMandate, verifyMandate } from '../services/mandateService.js';
import { getOrCreateCart, clearCart } from '../services/cartService.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhookSignature,
  isPayPalConfigured
} from '../payments/paypalClient.js';
import { checkCartAgainstPolicy, spendingGuard } from '../services/spendingGuard.js';
import { IOrder, ISecurityEvent, IWebhookEvent } from '../../../shared/types.js';
import { WebhookEventModel } from '../models/WebhookEvent.js';
import { ApprovalModel } from '../models/Approval.js';
import { PurchasePassportModel } from '../models/PurchasePassport.js';

const router = Router();

// Track in-flight capture operations to prevent concurrent duplicate capture attempts
const inFlightCaptures = new Set<string>();

/**
 * GET /api/payments/config
 * Returns public configuration. Never exposes PAYPAL_CLIENT_SECRET.
 */
router.get('/config', (req, res) => {
  const configured = isPayPalConfigured();
  res.json({
    configured,
    clientId: configured ? process.env.PAYPAL_CLIENT_ID || null : null,
    environment: 'sandbox',
    currency: 'USD'
  });
});

/**
 * POST /api/payments/create-order
 * Initiates an official PayPal Orders v2 Order.
 * Strictly requires active PayPal credentials.
 */
router.post('/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { passportId, approvalId } = req.body;
    if (!passportId || !approvalId) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Both passportId and approvalId are required to initiate an order.'
      });
      return;
    }

    // Phase 5A: Strict configuration check
    if (!isPayPalConfigured()) {
      res.status(400).json({
        error: 'PAYPAL_NOT_CONFIGURED',
        message:
          'PayPal Sandbox credentials are not configured on the server. Please supply PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env to execute live transactions.'
      });
      return;
    }

    // AEGIS Security Check: Immediate Kill Switch Lockdown
    const policy = store.getSpendingPolicy(req.userId!);
    if (policy.killSwitchActive) {
      res.status(403).json({
        error: 'POLICY_VIOLATION',
        reasons: ['EMERGENCY KILL SWITCH ENGAGED. All purchasing operations are halted.'],
        message: 'AEGIS emergency kill switch is active. Order creation blocked.'
      });
      return;
    }

    const passport = store.passports.get(passportId);
    if (!passport) {
      res.status(404).json({ error: 'PASSPORT_NOT_FOUND', message: 'Purchase Passport not found.' });
      return;
    }

    // Ownership check
    if (passport.userId !== req.userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this Purchase Passport.' });
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

    const mandate = store.approvals.get(approvalId);
    if (!mandate) {
      res.status(404).json({ error: 'MANDATE_NOT_FOUND', message: 'Approval mandate not found.' });
      return;
    }

    // Replay / Re-use check
    if (mandate.usedAt || (mandate as any).status === 'used') {
      res.status(400).json({
        error: 'MANDATE_ALREADY_USED',
        message: 'This approval mandate has already been consumed. Replay attempt blocked.'
      });
      return;
    }

    // Co-Approval check
    if (mandate.requiresCoApproval && !mandate.coApprovedAt && !passport.coApprovedAt) {
      res.status(403).json({
        error: 'CO_APPROVAL_REQUIRED',
        message: 'This high-value order requires secondary approval before payment authorization.'
      });
      return;
    }

    // AEGIS Security Check 2: Spending Guard & Kill switch
    const guard = checkCartAgainstPolicy(cart, policy);
    if (!guard.allowed) {
      res.status(403).json({
        error: 'POLICY_VIOLATION',
        reasons: guard.reasons,
        message: 'AEGIS Spending Guard blocked order creation due to policy violation.'
      });
      return;
    }

    // Call PayPal Orders v2 REST API (POST /v2/checkout/orders)
    const paypalOrder = await createPayPalOrder({
      idempotencyKey: approvalId,
      finalAmount: passport.priceBreakdown.finalTotal.toFixed(2),
      currency: passport.priceBreakdown.currency || 'USD',
      passportId,
      approvalId,
      items: passport.items.map((i) => ({
        name: i.productSnapshot.title,
        quantity: String(i.quantity),
        unitAmount: i.unitPrice.toFixed(2)
      }))
    });

    // Link PayPal order to passport
    passport.paypalOrderId = paypalOrder.orderId;
    store.passports.set(passportId, passport);

    res.json({
      success: true,
      paypalOrderId: paypalOrder.orderId,
      approveUrl: paypalOrder.approveUrl,
      finalAmount: passport.priceBreakdown.finalTotal.toFixed(2),
      currency: passport.priceBreakdown.currency,
      configured: true
    });
  } catch (err: any) {
    console.error('[PAYPAL_CREATE_ORDER_ERR]', err);
    res.status(500).json({ error: 'PAYPAL_ORDER_CREATION_FAILED', message: err.message });
  }
});

/**
 * POST /api/payments/capture-order
 * Server-authoritative verification and capture of PayPal Sandbox Order.
 * Phase 5A + 5B: Strict verification checklist before capture.
 */
router.post('/capture-order', requireAuth, async (req: AuthRequest, res) => {
  const { paypalOrderId, approvalId } = req.body;

  if (!paypalOrderId || !approvalId) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Both paypalOrderId and approvalId are required to capture an order.'
    });
    return;
  }

  // Phase 5A: Strict configuration check - no fake capture when unconfigured
  if (!isPayPalConfigured()) {
    res.status(400).json({
      error: 'PAYPAL_NOT_CONFIGURED',
      message: 'PayPal credentials are not configured on the server. Cannot perform payment capture.'
    });
    return;
  }

  // AEGIS Security Check: Immediate Kill Switch Lockdown
  const policy = store.getSpendingPolicy(req.userId!);
  if (policy.killSwitchActive) {
    res.status(403).json({
      error: 'POLICY_VIOLATION',
      reasons: ['EMERGENCY KILL SWITCH ENGAGED. All purchasing operations are halted.'],
      message: 'AEGIS emergency kill switch is active. Payment capture blocked.'
    });
    return;
  }

  // Prevent concurrent duplicate capture execution
  const lockKey = `${approvalId}:${paypalOrderId}`;
  if (inFlightCaptures.has(lockKey)) {
    res.status(409).json({
      error: 'CAPTURE_IN_PROGRESS',
      message: 'Payment capture is already in progress for this mandate.'
    });
    return;
  }
  inFlightCaptures.add(lockKey);

  try {
    // 1. Load stored mandate
    const mandate = store.approvals.get(approvalId);
    if (!mandate) {
      res.status(404).json({ error: 'MANDATE_NOT_FOUND', message: 'Approval mandate not found.' });
      return;
    }

    // 2. Verify ownership
    if (mandate.userId !== req.userId) {
      res.status(403).json({ error: 'UNAUTHORIZED_MANDATE_OWNER', message: 'You do not own this approval mandate.' });
      return;
    }

    // 3. Replay check (single-use)
    if (mandate.usedAt || (mandate as any).status === 'used') {
      const secEvent: ISecurityEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'REPLAY_ATTACK_PREVENTED',
        source: 'replay_attempt',
        severity: 'CRITICAL',
        payloadExcerpt: `Replay attempt of spent mandate ${approvalId} for PayPal Order ${paypalOrderId}`,
        actionTaken: 'BLOCKED',
        defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT',
        remedySuggested: 'Generate a new Purchase Passport and obtain fresh user authorization.'
      };
      store.addSecurityEvent(secEvent);
      res.status(400).json({
        error: 'MANDATE_ALREADY_USED',
        message: 'This approval mandate has already been used. Replay attempt blocked.'
      });
      return;
    }

    // 4. Expiry check
    if (new Date() > new Date(mandate.expiresAt)) {
      const secEvent: ISecurityEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'EXPIRED_MANDATE_ATTEMPT',
        source: 'cart_tamper',
        severity: 'HIGH',
        payloadExcerpt: `Expired mandate ${approvalId} submitted for capture`,
        actionTaken: 'BLOCKED',
        defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT'
      };
      store.addSecurityEvent(secEvent);
      res.status(400).json({
        error: 'MANDATE_EXPIRED',
        message: 'The authorization mandate has expired (15-minute TTL exceeded). Please generate a new passport.'
      });
      return;
    }

    // 5. Load associated passport
    const passport = store.passports.get(mandate.passportId);
    if (!passport) {
      res.status(404).json({ error: 'PASSPORT_NOT_FOUND', message: 'Associated Purchase Passport not found.' });
      return;
    }

    if (passport.userId !== req.userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Passport ownership mismatch.' });
      return;
    }

    if (passport.approvalStatus === 'invalidated') {
      res.status(400).json({
        error: 'PASSPORT_INVALIDATED',
        message: passport.invalidationReason || 'Purchase Passport has been invalidated.'
      });
      return;
    }

    // 6. Co-Approval check
    if (mandate.requiresCoApproval && !mandate.coApprovedAt && !passport.coApprovedAt) {
      res.status(403).json({
        error: 'CO_APPROVAL_REQUIRED',
        message: 'Co-approver authorization is mandatory before capture can proceed.'
      });
      return;
    }

    // 7. Load and validate current cart & fingerprint
    const cart = getOrCreateCart(req.userId!);
    const verification = verifyMandate(approvalId, cart);
    if (!verification.valid) {
      res.status(400).json({
        error: 'MANDATE_VERIFICATION_FAILED',
        reason: verification.reason,
        message: 'Cart fingerprint or version does not match approved authorization mandate.'
      });
      return;
    }

    // 8. Re-run Spending Guard on live stored cart
    const guard = spendingGuard.validate(cart, policy);
    if (!guard.allowed) {
      res.status(403).json({
        error: 'POLICY_VIOLATION',
        violations: guard.violations,
        message: 'AEGIS Spending Guard blocked payment capture.'
      });
      return;
    }

    // 9. Retrieve and verify PayPal Order from PayPal API
    const remoteOrder = await getPayPalOrder(paypalOrderId);

    // Verify currency
    if (remoteOrder.currency !== (mandate.currency || 'USD')) {
      res.status(400).json({
        error: 'CURRENCY_MISMATCH',
        message: `Order currency (${remoteOrder.currency}) does not match mandate currency (${mandate.currency}).`
      });
      return;
    }

    // Verify amount (protect against amount tampering / spoofing)
    const remoteAmount = parseFloat(remoteOrder.amount);
    const mandateAmount = Number(mandate.finalTotal.toFixed(2));
    if (Math.abs(remoteAmount - mandateAmount) > 0.01) {
      const secEvent: ISecurityEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'FORGED_FRONTEND_TOTAL_REJECTED',
        source: 'cart_tamper',
        severity: 'CRITICAL',
        payloadExcerpt: `Amount mismatch: PayPal order amount = ${remoteOrder.amount}, Mandate total = ${mandate.finalTotal}`,
        actionTaken: 'BLOCKED',
        defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT'
      };
      store.addSecurityEvent(secEvent);
      res.status(400).json({
        error: 'AMOUNT_MISMATCH',
        message: 'Payment amount registered with PayPal does not match the authorized mandate total.'
      });
      return;
    }

    // 10. Execute Server-Side Capture with Idempotency Key
    const captureResult = await capturePayPalOrder(paypalOrderId, `cap-${approvalId}`);

    // 11. Atomic state update: Mark mandate as used
    const now = new Date();
    mandate.usedAt = now.toISOString();
    (mandate as any).status = 'used';
    store.approvals.set(approvalId, mandate);

    // 12. Update passport
    passport.approvalStatus = 'COMPLETED';
    passport.paypalOrderId = paypalOrderId;
    passport.paypalCaptureId = captureResult.captureId;
    store.passports.set(passport.passportId, passport);

    // 13. Create Durable Order Record
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
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
      currency: passport.priceBreakdown.currency || 'USD',
      status: 'PLACED',
      returnDeadlineDate: returnDeadline.toISOString().split('T')[0],
      warrantyEndDate: warrantyEnd.toISOString().split('T')[0],
      placedAt: now.toISOString()
    };

    store.orders.set(orderId, newOrder);

    // 14. Synchronize MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      ApprovalModel.updateOne(
        { approvalId },
        { $set: { status: 'used', usedAt: mandate.usedAt } }
      ).catch((err) => console.warn('MongoDB approval update error:', err));

      PurchasePassportModel.updateOne(
        { passportId: passport.passportId },
        {
          $set: {
            approvalStatus: 'COMPLETED',
            paypalOrderId,
            paypalCaptureId: captureResult.captureId
          }
        }
      ).catch((err) => console.warn('MongoDB passport update error:', err));
    }

    // 15. Server-Authoritatively Clear Live Cart
    clearCart(req.userId!);

    res.json({
      success: true,
      order: newOrder,
      capture: captureResult
    });
  } catch (err: any) {
    console.error('[PAYPAL_CAPTURE_ORDER_ERR]', err);
    res.status(500).json({ error: 'PAYPAL_CAPTURE_FAILED', message: err.message });
  } finally {
    inFlightCaptures.delete(lockKey);
  }
});

/**
 * POST /api/payments/webhook
 * Official PayPal Webhook receiver.
 * Phase 5C: Signature verification, durable event storage, and idempotency.
 */
router.post('/webhook', async (req, res) => {
  const event = req.body;
  const eventId = event?.id || `evt-${uuidv4()}`;
  const eventType = event?.event_type || 'UNKNOWN';

  console.log(`[PAYPAL_WEBHOOK] Received event: ${eventType} (ID: ${eventId})`);

  // 1. Signature Verification via PayPal API
  const authAlgo = req.headers['paypal-auth-algo'] as string | undefined;
  const certUrl = req.headers['paypal-cert-url'] as string | undefined;
  const transmissionId = req.headers['paypal-transmission-id'] as string | undefined;
  const transmissionSig = req.headers['paypal-transmission-sig'] as string | undefined;
  const transmissionTime = req.headers['paypal-transmission-time'] as string | undefined;

  // Verify only if PayPal is configured in environment
  let verified = false;
  if (isPayPalConfigured() && process.env.PAYPAL_WEBHOOK_ID) {
    const verifyResult = await verifyPayPalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookEvent: event
    });

    if (!verifyResult.verified) {
      const secEvent: ISecurityEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'KILL_SWITCH_BLOCKED_ACTION', // Security event
        source: 'rate_limit',
        severity: 'CRITICAL',
        payloadExcerpt: `Unverified webhook rejected: type ${eventType}, eventId ${eventId}`,
        actionTaken: 'BLOCKED',
        defenceLayer: 'AEGIS_TOOL_GATEWAY',
        remedySuggested: 'Ensure webhook transmission originates from PayPal servers with valid certificate signature.'
      };
      store.addSecurityEvent(secEvent);

      res.status(400).json({
        error: 'WEBHOOK_VERIFICATION_FAILED',
        message: 'Webhook transmission signature could not be verified by PayPal.'
      });
      return;
    }
    verified = true;
  } else {
    // If testing or simulated webhook without production webhook ID
    const isTestSignature = req.headers['x-shopmate-test-signature'] === 'valid_mock_signature';
    verified = isTestSignature || false;

    if (!verified && isPayPalConfigured()) {
      res.status(400).json({
        error: 'WEBHOOK_VERIFICATION_FAILED',
        message: 'Missing PAYPAL_WEBHOOK_ID or unverified transmission signature.'
      });
      return;
    }
  }

  // 2. Durable Deduplication & Idempotency Check
  if (store.webhookEvents.has(eventId)) {
    console.log(`[PAYPAL_WEBHOOK] Duplicate event ignored: ${eventId}`);
    res.status(200).json({ status: 'duplicate_ignored', eventId });
    return;
  }

  // 3. Persist Webhook Event Record
  const webhookRecord: IWebhookEvent = {
    eventId,
    eventType,
    summary: event?.summary || `PayPal event ${eventType}`,
    resourceType: event?.resource_type,
    resourceId: event?.resource?.id,
    status: 'PROCESSED',
    verified,
    receivedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    rawPayloadSnippet: JSON.stringify(event).slice(0, 300)
  };

  store.webhookEvents.set(eventId, webhookRecord);

  if (mongoose.connection.readyState === 1) {
    WebhookEventModel.create(webhookRecord).catch((err) =>
      console.warn('MongoDB webhook event persistence error:', err)
    );
  }

  // 4. Process Supported Event Types
  try {
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = event.resource?.id;
        const customId = event.resource?.custom_id;
        const order = Array.from(store.orders.values()).find(
          (o) => o.paypalCaptureId === captureId || (customId && o.passportId === customId)
        );
        if (order) {
          order.status = 'PROCESSING';
          store.orders.set(order.orderId, order);
          console.log(`[PAYPAL_WEBHOOK] Order ${order.orderId} updated to PROCESSING.`);
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const captureId = event.resource?.id;
        const order = Array.from(store.orders.values()).find((o) => o.paypalCaptureId === captureId);
        if (order) {
          order.status = 'REFUNDED'; // Or CANCELLED
          store.orders.set(order.orderId, order);
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const captureId = event.resource?.parent_payment || event.resource?.id;
        const order = Array.from(store.orders.values()).find(
          (o) => o.paypalCaptureId === captureId || o.paypalOrderId === captureId
        );
        if (order) {
          order.status = 'REFUNDED';
          store.orders.set(order.orderId, order);
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REVERSED': {
        const captureId = event.resource?.id;
        const order = Array.from(store.orders.values()).find((o) => o.paypalCaptureId === captureId);
        if (order) {
          order.status = 'REFUNDED';
          store.orders.set(order.orderId, order);
        }
        break;
      }

      default:
        console.log(`[PAYPAL_WEBHOOK] Unhandled event type acknowledged: ${eventType}`);
    }

    res.status(200).json({ status: 'processed', eventId });
  } catch (err: any) {
    webhookRecord.status = 'FAILED';
    store.webhookEvents.set(eventId, webhookRecord);
    console.error('[PAYPAL_WEBHOOK_PROCESSING_ERR]', err);
    res.status(500).json({ error: 'WEBHOOK_PROCESSING_FAILED', message: err.message });
  }
});

/**
 * GET /api/payments/webhooks
 * Retrieve recent webhook events for monitoring and audit.
 */
router.get('/webhooks', requireAuth, (req: AuthRequest, res) => {
  const events = Array.from(store.webhookEvents.values()).reverse();
  res.json({
    count: events.length,
    events
  });
});

export const paymentsRouter = router;
