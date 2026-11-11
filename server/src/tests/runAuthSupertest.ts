import request from 'supertest';
import { app } from '../index.js';
import { store } from '../db/inMemoryStore.js';
import { requireAdmin } from '../middleware/auth.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

async function run() {
  console.log('\n===============================================================');
  console.log('🧪 SUPERTEST AUTH & ROLE AUTHORIZATION SUITE');
  console.log('===============================================================\n');

  const testUser = {
    name: 'Supertest Shopper',
    email: `test-${Date.now()}@shopmate.ai`,
    password: 'Password123!'
  };

  // 1. Register
  console.log('1. Testing POST /api/auth/register...');
  const regRes = await request(app)
    .post('/api/auth/register')
    .send(testUser);

  assert(regRes.status === 201, 'Status is 201 Created');
  assert(regRes.body.user.email === testUser.email.toLowerCase(), 'Returns registered user object');
  assert(regRes.body.user.role === 'user', 'Default role is user');

  const userId = regRes.body.user.userId;
  const policy = store.getSpendingPolicy(userId);
  assert(policy !== undefined && policy.totalBudget === 2500, 'Auto-created default AEGIS spending policy in DB');

  const agents = store.getAgentsByUserId(userId);
  assert(agents.length >= 1 && agents[0].status === 'active', 'Auto-created default active shopping agent in DB');

  const memory = store.getMemoryProfile(userId);
  assert(memory !== undefined && memory.personalizationEnabled === false, 'Auto-created ShopMate Memory profile with personalization OFF');

  const cookies = regRes.headers['set-cookie'];
  assert(cookies && cookies[0].includes('shopmate_token'), 'Sets httpOnly session cookie');

  // 2. Login correct
  console.log('\n2. Testing POST /api/auth/login with correct password...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: testUser.email, password: testUser.password });

  assert(loginRes.status === 200, 'Status is 200 OK');
  assert(loginRes.body.user.name === testUser.name, 'Returns authenticated user');
  const userCookie = loginRes.headers['set-cookie'][0];

  // 3. Login wrong password
  console.log('\n3. Testing POST /api/auth/login with wrong password...');
  const wrongRes = await request(app)
    .post('/api/auth/login')
    .send({ email: testUser.email, password: 'WrongPassword999!' });

  assert(wrongRes.status === 401, 'Status is 401 Unauthorized');
  assert(wrongRes.body.error === 'INVALID_CREDENTIALS', 'Returns safe error message without leaks');

  // 4. Protected route without cookie
  console.log('\n4. Testing GET /api/auth/me without cookie...');
  const noCookieRes = await request(app)
    .get('/api/auth/me');

  assert(noCookieRes.status === 401, 'Status is 401 Unauthorized without session cookie');
  assert(noCookieRes.body.error === 'UNAUTHENTICATED', 'Error code is UNAUTHENTICATED');

  // 5. Protected route with cookie
  console.log('\n5. Testing GET /api/auth/me with valid cookie...');
  const withCookieRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', userCookie);

  assert(withCookieRes.status === 200, 'Status is 200 OK with valid cookie');
  assert(withCookieRes.body.user.email === testUser.email.toLowerCase(), 'Returns authenticated identity');

  // 6. Admin route as normal user (403 Forbidden)
  console.log('\n6. Testing Admin authorization as normal user (403 Forbidden)...');
  let adminForbidden = false;
  const mockReq: any = {
    cookies: {
      shopmate_token: userCookie.split(';')[0].split('=')[1]
    }
  };
  const mockRes: any = {
    status: (code: number) => {
      if (code === 403) adminForbidden = true;
      return { json: (d: any) => {} };
    }
  };
  requireAdmin(mockReq, mockRes, () => {});
  assert(adminForbidden, 'requireAdmin middleware returns 403 Forbidden for user role');

  // 7. Rate limiter test
  console.log('\n7. Testing auth rate limiting...');
  let rateLimited = false;
  for (let i = 0; i < 20; i++) {
    const rlRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rate-limit-test@shopmate.ai', password: 'AnyPassword' });

    if (rlRes.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(rateLimited, 'Rate limiter triggers HTTP 429 after excessive rapid requests');

  console.log('\n===============================================================');
  console.log(`📊 SUPERTEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

