import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Shopping API Integration Tests (Supertest)', () => {
  let userCookie: string;
  let otherUserCookie: string;
  let testConversationId: string;

  it('authenticates demo user and retrieves session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@shopmate.ai', password: 'DemoPass123!' });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    userCookie = cookies[0].split(';')[0];
  });

  it('registers second user for user-scoping checks', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Shopper',
        email: `shopper2_${Date.now()}@example.com`,
        password: 'Password123!'
      });

    expect(res.status).toBe(201);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    otherUserCookie = cookies[0].split(';')[0];
  });

  it('rejects unauthenticated requests to /api/shopping/search', async () => {
    const res = await request(app)
      .post('/api/shopping/search')
      .send({ category: 'laptops' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
  });

  it('executes deterministic search when authenticated', async () => {
    const res = await request(app)
      .post('/api/shopping/search')
      .set('Cookie', userCookie)
      .send({
        category: 'laptops',
        maxPrice: 1200,
        limit: 5
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
    for (const p of res.body.products) {
      expect(p.category).toBe('laptops');
      expect(p.price).toBeLessThanOrEqual(1200);
    }
  });

  it('executes shopping chat turn and persists conversation', async () => {
    const res = await request(app)
      .post('/api/shopping/chat')
      .set('Cookie', userCookie)
      .send({
        message: 'I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversationId).toBeDefined();
    testConversationId = res.body.conversationId;

    expect(res.body.understoodRequirements.category).toBe('laptops');
    expect(res.body.understoodRequirements.budget.amount).toBe(1000);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.assistantMessage.content).toContain('1,000');
  });

  it('lists user conversations', async () => {
    const res = await request(app)
      .get('/api/shopping/conversations')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    const found = res.body.conversations.find((c: any) => c.conversationId === testConversationId);
    expect(found).toBeDefined();
  });

  it('enforces strict user scoping: other user cannot read user conversation', async () => {
    const res = await request(app)
      .get(`/api/shopping/conversations/${testConversationId}`)
      .set('Cookie', otherUserCookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('CONVERSATION_NOT_FOUND');
  });

  it('allows owner to read conversation details', async () => {
    const res = await request(app)
      .get(`/api/shopping/conversations/${testConversationId}`)
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversation.conversationId).toBe(testConversationId);
    expect(res.body.conversation.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('streams chat response via SSE text/event-stream', async () => {
    const res = await request(app)
      .post('/api/shopping/chat?stream=true')
      .set('Cookie', userCookie)
      .set('Accept', 'text/event-stream')
      .send({
        conversationId: testConversationId,
        message: 'make it cheaper'
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('event: agent_status');
    expect(res.text).toContain('event: requirements_updated');
    expect(res.text).toContain('event: products');
    expect(res.text).toContain('event: done');
  });
});
