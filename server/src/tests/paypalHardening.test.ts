import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../index.js';
import { store } from '../db/inMemoryStore.js';
import * as paypalClient from '../payments/paypalClient.js';

describe('Phase 5: PayPal Hardening, Webhook Security & AEGIS Verification', () => {
  let userCookie: string;
  let userId: string;
  let passportId: string;
  let approvalId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    if (userId) {
      const policy = store.getSpendingPolicy(userId);
      policy.killSwitchActive = false;
      store.spendingPolicies.set(userId, policy);
    }
  });

  it('authenticates demo user and sets up clean cart with product', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@shopmate.ai', password: 'DemoPass123!' });
    expect(loginRes.status).toBe(200);
    userCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    userId = loginRes.body.user.userId;

    // Reset kill switch & spending policy
    const policy = store.getSpendingPolicy(userId);
    policy.killSwitchActive = false;
    policy.totalBudget = 2500;
    policy.maxCartValue = 2500;
    policy.requireCoApprovalAboveAmount = 1500;
    store.spendingPolicies.set(userId, policy);

    // Clear cart and add product
    await request(app).delete('/api/cart').set('Cookie', userCookie);
    const addRes = await request(app)
      .post('/api/cart/add')
      .set('Cookie', userCookie)
      .send({ productId: 'prod-lap-zenbook-pro', quantity: 1 });
    expect(addRes.status).toBe(200);

    // Generate passport
    const passRes = await request(app)
      .post('/api/passport/generate')
      .set('Cookie', userCookie)
      .send({ missionGoal: 'Engineering Workstation' });
    expect(passRes.status).toBe(200);
    passportId = passRes.body.passport.passportId;

    // Approve passport to issue signed mandate
    const apprvRes = await request(app)
      .post(`/api/passport/${passportId}/approve`)
      .set('Cookie', userCookie);
    expect(apprvRes.status).toBe(200);
    approvalId = apprvRes.body.mandate.approvalId;
  });

  // TEST 10 (Part A): Missing Credentials produces PAYPAL_NOT_CONFIGURED (Phase 5A)
  it('10A. rejects checkout and capture with PAYPAL_NOT_CONFIGURED when credentials missing', async () => {
    // Ensure isPayPalConfigured returns false
    const configSpy = vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(false);

    // 1. Create order attempt
    const createRes = await request(app)
      .post('/api/payments/create-order')
      .set('Cookie', userCookie)
      .send({ passportId, approvalId });
    expect(createRes.status).toBe(400);
    expect(createRes.body.error).toBe('PAYPAL_NOT_CONFIGURED');
    expect(createRes.body.paypalOrderId).toBeUndefined();

    // 2. Capture order attempt
    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'MOCK-ORDER-123', approvalId });
    expect(capRes.status).toBe(400);
    expect(capRes.body.error).toBe('PAYPAL_NOT_CONFIGURED');
    expect(capRes.body.order).toBeUndefined();
    expect(capRes.body.capture).toBeUndefined();

    configSpy.mockRestore();
  });

  // TEST 1: Normal PayPal Sandbox Purchase & Server-Authoritative Capture
  it('1. executes normal server-authoritative PayPal purchase when credentials configured', async () => {
    const passport = store.passports.get(passportId)!;
    const finalAmountStr = passport.priceBreakdown.finalTotal.toFixed(2);

    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);
    vi.spyOn(paypalClient, 'createPayPalOrder').mockResolvedValue({
      orderId: 'PAYPAL-SANDBOX-ORDER-991',
      approveUrl: 'https://sandbox.paypal.com/checkoutnow?token=TEST',
      status: 'CREATED'
    });
    vi.spyOn(paypalClient, 'getPayPalOrder').mockResolvedValue({
      id: 'PAYPAL-SANDBOX-ORDER-991',
      status: 'APPROVED',
      intent: 'CAPTURE',
      amount: finalAmountStr,
      currency: 'USD',
      customId: passportId,
      referenceId: approvalId
    });
    vi.spyOn(paypalClient, 'capturePayPalOrder').mockResolvedValue({
      captureId: 'CAP-GENUINE-PAYPAL-991',
      status: 'COMPLETED',
      amount: finalAmountStr,
      currency: 'USD',
      payerEmail: 'jane.buyer@sandbox.paypal.com'
    });

    // 1. Create Order
    const createRes = await request(app)
      .post('/api/payments/create-order')
      .set('Cookie', userCookie)
      .send({ passportId, approvalId });
    expect(createRes.status).toBe(200);
    expect(createRes.body.paypalOrderId).toBe('PAYPAL-SANDBOX-ORDER-991');

    // 2. Server Capture
    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'PAYPAL-SANDBOX-ORDER-991', approvalId });
    expect(capRes.status).toBe(200);
    expect(capRes.body.success).toBe(true);
    expect(capRes.body.order.status).toBe('PLACED');
    expect(capRes.body.order.paypalCaptureId).toBe('CAP-GENUINE-PAYPAL-991');
    expect(capRes.body.capture.status).toBe('COMPLETED');

    // 3. Confirm mandate marked used
    const mandate = store.approvals.get(approvalId);
    expect(mandate?.usedAt).toBeDefined();

    // 4. Confirm cart cleared
    const cartRes = await request(app).get('/api/cart').set('Cookie', userCookie);
    expect(cartRes.body.cart.items.length).toBe(0);
  });

  // TEST 6: Duplicate Capture & Replay Protection
  it('6. prevents duplicate capture replay attack using the same mandate', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    // Attempt to capture again with the already consumed approvalId
    const replayRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'PAYPAL-SANDBOX-ORDER-991', approvalId });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error).toBe('MANDATE_ALREADY_USED');

    // Check security ledger registered the attack
    const secEvent = store.securityEvents.find(
      (e) => e.eventType === 'REPLAY_ATTACK_PREVENTED'
    );
    expect(secEvent).toBeDefined();
    expect(secEvent?.actionTaken).toBe('BLOCKED');
  });

  // TEST 2: Invalid Approval Mandate
  it('2. rejects capture when mandate does not exist or is invalid', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    const res = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'ORDER-123', approvalId: 'appr-nonexistent-uuid' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('MANDATE_NOT_FOUND');
  });

  // TEST 3: Expired Approval Mandate (15-min TTL)
  it('3. rejects capture when approval mandate has exceeded 15-minute TTL', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    // Create a fresh cart and passport
    await request(app).post('/api/cart/add').set('Cookie', userCookie).send({ productId: 'prod-lap-zenbook-pro', quantity: 1 });
    const passRes = await request(app).post('/api/passport/generate').set('Cookie', userCookie).send({});
    const newPassId = passRes.body.passport.passportId;

    const apprvRes = await request(app).post(`/api/passport/${newPassId}/approve`).set('Cookie', userCookie);
    const expiredApprovalId = apprvRes.body.mandate.approvalId;

    // Artificially expire the mandate
    const mandate = store.approvals.get(expiredApprovalId)!;
    mandate.expiresAt = new Date(Date.now() - 60000).toISOString(); // 1 minute in the past
    store.approvals.set(expiredApprovalId, mandate);

    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'ORDER-EXPIRED-TEST', approvalId: expiredApprovalId });

    expect(capRes.status).toBe(400);
    expect(capRes.body.error).toBe('MANDATE_EXPIRED');

    const secEvent = store.securityEvents.find(
      (e) => e.eventType === 'EXPIRED_MANDATE_ATTEMPT'
    );
    expect(secEvent).toBeDefined();
  });

  // TEST 4: Modified Cart / Tamper Detection
  it('4. invalidates mandate and rejects capture when cart is modified post-approval', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    // Setup approved mandate
    await request(app).delete('/api/cart').set('Cookie', userCookie);
    await request(app).post('/api/cart/add').set('Cookie', userCookie).send({ productId: 'prod-lap-zenbook-pro', quantity: 1 });
    const passRes = await request(app).post('/api/passport/generate').set('Cookie', userCookie).send({});
    const freshPassId = passRes.body.passport.passportId;
    const apprvRes = await request(app).post(`/api/passport/${freshPassId}/approve`).set('Cookie', userCookie);
    const testApprId = apprvRes.body.mandate.approvalId;

    // Mutate cart after approval (e.g., increment quantity)
    await request(app).post('/api/cart/update').set('Cookie', userCookie).send({ productId: 'prod-lap-zenbook-pro', quantity: 2 });

    // Try to capture
    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'ORDER-TAMPER-TEST', approvalId: testApprId });

    expect(capRes.status).toBe(400);
    expect(capRes.body.error).toBe('PASSPORT_INVALIDATED');

    // Confirm passport status was marked invalidated
    const updatedPass = store.passports.get(freshPassId);
    expect(updatedPass?.approvalStatus).toBe('invalidated');
  });

  // TEST 5: Forged Amount Mismatch
  it('5. detects forged amount mismatch between PayPal order and authorized mandate', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    await request(app).delete('/api/cart').set('Cookie', userCookie);
    await request(app).post('/api/cart/add').set('Cookie', userCookie).send({ productId: 'prod-lap-zenbook-pro', quantity: 1 });
    const passRes = await request(app).post('/api/passport/generate').set('Cookie', userCookie).send({});
    const freshPassId = passRes.body.passport.passportId;
    const apprvRes = await request(app).post(`/api/passport/${freshPassId}/approve`).set('Cookie', userCookie);
    const testApprId = apprvRes.body.mandate.approvalId;

    // Mock PayPal order returning spoofed price of $1.00
    vi.spyOn(paypalClient, 'getPayPalOrder').mockResolvedValue({
      id: 'ORDER-FORGED-1',
      status: 'APPROVED',
      intent: 'CAPTURE',
      amount: '1.00', // Spoofed amount!
      currency: 'USD',
      customId: freshPassId,
      referenceId: testApprId
    });

    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'ORDER-FORGED-1', approvalId: testApprId });

    expect(capRes.status).toBe(400);
    expect(capRes.body.error).toBe('AMOUNT_MISMATCH');

    const secEvent = store.securityEvents.find(
      (e) => e.eventType === 'FORGED_FRONTEND_TOTAL_REJECTED'
    );
    expect(secEvent).toBeDefined();
  });

  // TEST 7: Unverified Webhook Signature Rejection
  it('7. rejects unverified webhook transmissions with HTTP 400', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);
    process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST-ID';

    vi.spyOn(paypalClient, 'verifyPayPalWebhookSignature').mockResolvedValue({
      verified: false,
      status: 'FAILURE'
    });

    const webhookRes = await request(app)
      .post('/api/payments/webhook')
      .set('paypal-auth-algo', 'SHA256withRSA')
      .set('paypal-cert-url', 'https://api.sandbox.paypal.com/cert.pem')
      .set('paypal-transmission-id', 'trans-unverified-1')
      .set('paypal-transmission-sig', 'bad_signature')
      .set('paypal-transmission-time', new Date().toISOString())
      .send({
        id: 'WH-EVT-UNVERIFIED-01',
        event_type: 'PAYMENT.CAPTURE.COMPLETED'
      });

    expect(webhookRes.status).toBe(400);
    expect(webhookRes.body.error).toBe('WEBHOOK_VERIFICATION_FAILED');
  });

  // TEST 8: Duplicate Webhook Idempotency
  it('8. handles duplicate webhooks idempotently without reprocessing side effects', async () => {
    const eventId = `WH-EVT-IDEMP-${Date.now()}`;

    // First delivery (with test signature header)
    const firstRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-shopmate-test-signature', 'valid_mock_signature')
      .send({
        id: eventId,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAP-TEST-IDEMP' }
      });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.status).toBe('processed');

    // Duplicate delivery
    const dupRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-shopmate-test-signature', 'valid_mock_signature')
      .send({
        id: eventId,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAP-TEST-IDEMP' }
      });
    expect(dupRes.status).toBe(200);
    expect(dupRes.body.status).toBe('duplicate_ignored');
    expect(dupRes.body.eventId).toBe(eventId);
  });

  // TEST 9: Emergency Kill Switch Enforcement
  it('9. blocks checkout creation when AEGIS Emergency Kill Switch is active', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    // Engage kill switch
    await request(app)
      .post('/api/security/kill-switch')
      .set('Cookie', userCookie)
      .send({ active: true });

    try {
      // Attempt to create PayPal order
      const orderRes = await request(app)
        .post('/api/payments/create-order')
        .set('Cookie', userCookie)
        .send({ passportId: 'any-id', approvalId: 'any-id' });

      expect(orderRes.status).toBe(403);
      expect(orderRes.body.error).toBe('POLICY_VIOLATION');
    } finally {
      // Disengage kill switch for subsequent tests
      await request(app)
        .post('/api/security/kill-switch')
        .set('Cookie', userCookie)
        .send({ active: false });
    }
  });

  // TEST 10 (Part B): Payment Capture Incomplete Failure
  it('10B. handles PayPal capture failure gracefully without creating order', async () => {
    vi.spyOn(paypalClient, 'isPayPalConfigured').mockReturnValue(true);

    await request(app).delete('/api/cart').set('Cookie', userCookie);
    await request(app).post('/api/cart/add').set('Cookie', userCookie).send({ productId: 'prod-lap-zenbook-pro', quantity: 1 });
    const passRes = await request(app).post('/api/passport/generate').set('Cookie', userCookie).send({});
    const freshPassId = passRes.body.passport.passportId;
    const apprvRes = await request(app).post(`/api/passport/${freshPassId}/approve`).set('Cookie', userCookie);
    const testApprId = apprvRes.body.mandate.approvalId;
    const finalAmountStr = passRes.body.passport.priceBreakdown.finalTotal.toFixed(2);

    vi.spyOn(paypalClient, 'getPayPalOrder').mockResolvedValue({
      id: 'ORDER-FAIL-TEST',
      status: 'APPROVED',
      intent: 'CAPTURE',
      amount: finalAmountStr,
      currency: 'USD',
      customId: freshPassId,
      referenceId: testApprId
    });

    vi.spyOn(paypalClient, 'capturePayPalOrder').mockRejectedValue(
      new Error('PAYPAL_CAPTURE_INCOMPLETE: Payment status is DECLINED')
    );

    const capRes = await request(app)
      .post('/api/payments/capture-order')
      .set('Cookie', userCookie)
      .send({ paypalOrderId: 'ORDER-FAIL-TEST', approvalId: testApprId });

    expect(capRes.status).toBe(500);
    expect(capRes.body.error).toBe('PAYPAL_CAPTURE_FAILED');

    // Confirm no order was created
    const ordersRes = await request(app).get('/api/orders').set('Cookie', userCookie);
    const failedOrder = ordersRes.body.orders.find((o: any) => o.passportId === freshPassId);
    expect(failedOrder).toBeUndefined();
  });

  // BONUS TEST: Co-Approver Passport Share & Authorization Flow (Phase 5E)
  it('verifies co-approver share link generation, read-only inspection, and co-approval', async () => {
    // 1. Generate share link
    const shareRes = await request(app)
      .post(`/api/passport/${passportId}/share`)
      .set('Cookie', userCookie);
    expect(shareRes.status).toBe(200);
    expect(shareRes.body.token).toBeDefined();
    expect(shareRes.body.shareUrl).toContain(shareRes.body.token);

    const token = shareRes.body.token;

    // 2. Read-only inspection without auth cookie
    const reviewRes = await request(app).get(`/api/passport/share/${token}`);
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.passport.passportId).toBe(passportId);
    expect(reviewRes.body.isApproved).toBe(false);

    // 3. Co-approver approves
    const approveRes = await request(app)
      .post(`/api/passport/share/${token}/approve`)
      .send({ approverName: 'Marcus Brodie (Tech Director)' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.passport.coApprovedBy).toBe('Marcus Brodie (Tech Director)');
  });
});
