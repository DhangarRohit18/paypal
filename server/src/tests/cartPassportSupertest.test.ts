import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { store } from '../db/inMemoryStore.js';

describe('Phase 4: Cart & Purchase Passport Integration Suite (Supertest)', () => {
  let userACookie: string;
  let userBCookie: string;
  let userAId: string;
  let userBId: string;
  let passportId: string;
  let approvalId: string;

  it('authenticates User A and User B', async () => {
    // User A (Demo user)
    const resA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@shopmate.ai', password: 'DemoPass123!' });
    expect(resA.status).toBe(200);
    userACookie = resA.headers['set-cookie'][0].split(';')[0];
    userAId = resA.body.user.userId;

    // User B (Registered)
    const emailB = `shopperB_${Date.now()}@shopmate.ai`;
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User B', email: emailB, password: 'Password123!' });
    expect(resB.status).toBe(201);
    userBCookie = resB.headers['set-cookie'][0].split(';')[0];
    userBId = resB.body.user.userId;
  });

  it('clears User A cart and configures $500 total budget for verification test', async () => {
    // Clear cart
    await request(app).delete('/api/cart').set('Cookie', userACookie);

    // Set budget to $500
    const policyRes = await request(app)
      .post('/api/security/policies')
      .set('Cookie', userACookie)
      .send({
        totalBudget: 500,
        maxCartValue: 500,
        maxPricePerItem: 500
      });
    expect(policyRes.status).toBe(200);
    expect(policyRes.body.policy.totalBudget).toBe(500);
  });

  it('ignores forged unitPrice or total in request body and uses authoritative DB price', async () => {
    // Find a real product: Keychron K2 Wireless Keyboard ($89.99)
    const product = store.products.find((p) => p.category === 'keyboards');
    expect(product).toBeDefined();

    // Client maliciously sends unitPrice: 1.00 and itemTotal: 1.00
    const res = await request(app)
      .post('/api/cart/items')
      .set('Cookie', userACookie)
      .send({
        productId: product!.id,
        quantity: 1,
        unitPrice: 1.0,
        total: 1.0
      });

    expect(res.status).toBe(200);
    const addedItem = res.body.cart.items.find((i: any) => i.productId === product!.id);
    expect(addedItem.unitPrice).toBe(product!.price); // Server-authoritative DB price
    expect(addedItem.unitPrice).not.toBe(1.0);
  });

  it('blocks adding item that exceeds budget and returns plain-language explanation and fix', async () => {
    // Try adding a $550+ item when budget limit is $500
    const expensiveProduct = store.products.find((p) => p.price >= 600);
    expect(expensiveProduct).toBeDefined();

    const res = await request(app)
      .post('/api/cart/items')
      .set('Cookie', userACookie)
      .send({
        productId: expensiveProduct!.id,
        quantity: 1
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SPENDING_POLICY_VIOLATION');
    expect(res.body.violations.length).toBeGreaterThan(0);
    expect(res.body.suggestedFixes.length).toBeGreaterThan(0);

    // Verify SecurityEvent logged
    expect(store.securityEvents.length).toBeGreaterThan(0);
    const secEvt = store.securityEvents.find((e) => e.eventType === 'BUDGET_LIMIT_BREACH');
    expect(secEvt).toBeDefined();
  });

  it('enforces strict user scoping: User B cannot view or modify User A cart', async () => {
    const res = await request(app).get('/api/cart').set('Cookie', userBCookie);
    expect(res.status).toBe(200);
    expect(res.body.cart.userId).toBe(userBId);
    expect(res.body.cart.userId).not.toBe(userAId);
  });

  it('generates Purchase Passport and approves it into a signed mandate', async () => {
    // Generate passport for User A
    const passRes = await request(app)
      .post('/api/passports')
      .set('Cookie', userACookie)
      .send({ missionGoal: 'Productivity Setup' });

    expect(passRes.status).toBe(200);
    expect(passRes.body.passport).toBeDefined();
    passportId = passRes.body.passport.passportId;
    expect(passRes.body.passport.approvalStatus).toBe('pending_approval');

    // Approve passport
    const approveRes = await request(app)
      .post(`/api/passports/${passportId}/approve`)
      .set('Cookie', userACookie);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.passport.approvalStatus).toBe('approved');
    expect(approveRes.body.mandate).toBeDefined();
    approvalId = approveRes.body.mandate.approvalId;
    expect(approveRes.body.mandate.orderFingerprint).toBeDefined();
  });

  it('enforces user scoping: User B cannot inspect or approve User A passport', async () => {
    const res = await request(app)
      .get(`/api/passports/${passportId}`)
      .set('Cookie', userBCookie);
    expect(res.status).toBe(404);

    const approveRes = await request(app)
      .post(`/api/passports/${passportId}/approve`)
      .set('Cookie', userBCookie);
    expect(approveRes.status).toBe(404);
  });

  it('invalidates passport and mandate when cart is modified after approval', async () => {
    // User A adds another keyboard
    const otherProduct = store.products.find(
      (p) => p.category === 'mice' && p.price < 100
    );
    expect(otherProduct).toBeDefined();

    const modifyRes = await request(app)
      .post('/api/cart/items')
      .set('Cookie', userACookie)
      .send({ productId: otherProduct!.id, quantity: 1 });
    expect(modifyRes.status).toBe(200);

    // Inspect the passport -> must be INVALIDATED
    const checkPass = await request(app)
      .get(`/api/passports/${passportId}`)
      .set('Cookie', userACookie);

    expect(checkPass.status).toBe(200);
    expect(checkPass.body.passport.approvalStatus).toBe('invalidated');
    expect(checkPass.body.passport.invalidationReason).toContain('Cart contents modified');

    // Inspect mandate -> must be INVALIDATED
    const mandate = store.approvals.get(approvalId);
    expect(mandate).toBeDefined();
    expect((mandate as any).status).toBe('invalidated');
  });

  it('rejects approving an invalidated passport', async () => {
    const res = await request(app)
      .post(`/api/passports/${passportId}/approve`)
      .set('Cookie', userACookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PASSPORT_INVALIDATED');
  });
});

