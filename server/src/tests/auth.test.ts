import request from 'supertest';
import { app } from '../index.js';
import { store } from '../db/inMemoryStore.js';

describe('Auth & Role Authorization (Supertest)', () => {
  const testUser = {
    name: 'Supertest Shopper',
    email: `test-${Date.now()}@shopmate.ai`,
    password: 'Password123!'
  };

  let userCookie = '';

  test('1. POST /api/auth/register creates user and default AEGIS records', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('user');

    // Confirm DB writes: user, spending policy, shopping agent, memory profile
    const createdUserId = res.body.user.userId;
    expect(store.getUserById(createdUserId)).toBeDefined();

    const policy = store.getSpendingPolicy(createdUserId);
    expect(policy).toBeDefined();
    expect(policy.totalBudget).toBe(2500);

    const agents = store.getAgentsByUserId(createdUserId);
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents[0].status).toBe('active');

    const memory = store.getMemoryProfile(createdUserId);
    expect(memory).toBeDefined();
    expect(memory.personalizationEnabled).toBe(false); // Personalization OFF by default

    // Cookie present
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('shopmate_token');
  });

  test('2. POST /api/auth/login succeeds with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    const cookies = res.headers['set-cookie'];
    userCookie = cookies[0];
    expect(userCookie).toContain('shopmate_token');
  });

  test('3. POST /api/auth/login rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword999!' })
      .expect(401);

    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('4. GET /api/auth/me rejects unauthenticated request without cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.error).toBe('UNAUTHENTICATED');
  });

  test('5. GET /api/auth/me succeeds with valid cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', userCookie)
      .expect(200);

    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('6. Normal user is rejected on admin route (403 Forbidden)', async () => {
    // Attempting admin action or checking requireRole
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const cookie = res.headers['set-cookie'][0];

    // Let's create an admin-only test route or check admin requirement
    // In our router, requireAdmin is mounted on admin actions
    // Let's verify requireRole blocks non-admin
    const { requireAdmin } = await import('../middleware/auth.js');
    const mockReq: any = { cookies: { shopmate_token: cookie.split(';')[0].replace('shopmate_token=', '') } };
    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          expect(code).toBe(403);
          expect(data.error).toBe('FORBIDDEN');
        }
      })
    };
    requireAdmin(mockReq, mockRes, () => {
      throw new Error('Should not reach next for non-admin');
    });
  });

  test('7. Rate limiting blocks excessive rapid requests', async () => {
    // Send multiple rapid login requests to trigger rate limiter
    let triggered429 = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rate-limit-test@shopmate.ai', password: 'AnyPassword' });

      if (res.status === 429) {
        triggered429 = true;
        expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
        break;
      }
    }
    expect(triggered429).toBe(true);
  });
});

