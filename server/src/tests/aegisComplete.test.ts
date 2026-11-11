import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { toolGateway, TOOL_REGISTRY } from '../aegis/toolGateway.js';
import { evaluateCartRisk } from '../aegis/riskEngine.js';
import { store } from '../db/inMemoryStore.js';
import { discoveryRegistry } from '../services/discovery.js';
import { ICart, ISpendingPolicy } from '../../../shared/types.js';

describe('AEGIS Complete: 4-Tier Tool Gateway, Persistence, and Security Scenarios', () => {
  let authCookie: string;
  const testUserId = 'usr-demo-shopper-001';

  beforeEach(async () => {
    // Reset kill switch
    const policy = store.getSpendingPolicy(testUserId);
    policy.killSwitchActive = false;
    store.spendingPolicies.set(testUserId, policy);

    // Login demo user to get session cookie
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'demo@shopmate.ai',
      password: 'DemoPass123!'
    });
    authCookie = loginRes.headers['set-cookie']?.[0] || '';
  });

  describe('1. 4-Tier AEGIS Tool Gateway & Security Choke Point', () => {
    it('allows AI agents to execute Tier 1 read-only research tools', async () => {
      const result = await toolGateway.executeTool(
        {
          userId: testUserId,
          agentId: 'ai-agent-01',
          toolName: 'searchProducts',
          params: { category: 'laptops', limit: 2 },
          invoker: 'AI_AGENT'
        },
        () => [{ id: 'mock-laptop', title: 'Mock Laptop' }]
      );

      expect(result.success).toBe(true);
      expect(result.permissionCheck).toBe('PASSED');
      expect(result.tier).toBe('TIER_1_READ_ONLY_RESEARCH');
    });

    it('allows AI agents to execute Tier 2 cart modification tools with user context', async () => {
      const result = await toolGateway.executeTool(
        {
          userId: testUserId,
          agentId: 'ai-agent-01',
          toolName: 'addToCart',
          params: { productId: 'prod-lap-zenbook-pro', quantity: 1 },
          invoker: 'AI_AGENT'
        },
        () => ({ status: 'staged' })
      );

      expect(result.success).toBe(true);
      expect(result.permissionCheck).toBe('PASSED');
      expect(result.tier).toBe('TIER_2_CART_MODIFICATION');
    });

    it('strictly BLOCKS AI agents from invoking Tier 3 approval issuance tools', async () => {
      const result = await toolGateway.executeTool(
        {
          userId: testUserId,
          agentId: 'adversarial-ai-agent',
          toolName: 'approvePassport',
          params: { passportId: 'psp-hack-01' },
          invoker: 'AI_AGENT' // AI trying to authorize payment!
        },
        () => {
          throw new Error('Should never be called');
        }
      );

      expect(result.success).toBe(false);
      expect(result.permissionCheck).toBe('DENIED');
      expect(result.error).toContain('SECURITY_BOUNDARY_VIOLATION');
      expect(result.tier).toBe('TIER_3_APPROVAL_ISSUANCE');
    });

    it('strictly BLOCKS AI agents from invoking Tier 4 payment capture tools', async () => {
      const result = await toolGateway.executeTool(
        {
          userId: testUserId,
          agentId: 'adversarial-ai-agent',
          toolName: 'capturePayPalOrder',
          params: { paypalOrderId: 'PP-ORD-MALICIOUS' },
          invoker: 'AI_AGENT'
        },
        () => {
          throw new Error('Should never be called');
        }
      );

      expect(result.success).toBe(false);
      expect(result.permissionCheck).toBe('DENIED');
      expect(result.error).toContain('SECURITY_BOUNDARY_VIOLATION');
      expect(result.tier).toBe('TIER_4_PAYMENT_EXECUTION');
    });
  });

  describe('2. AEGIS Deterministic Risk Engine & CRITICAL Severity', () => {
    it('rates a normal cart within budget as LOW risk', () => {
      const cart: ICart = {
        id: 'cart-safe-01',
        userId: testUserId,
        version: 1,
        items: [
          {
            productId: 'prod-safe',
            productSnapshot: {
              id: 'prod-safe',
              title: 'Safe Mouse',
              price: 49.99,
              category: 'mice',
              brand: 'Logitech',
              merchantId: 'merch-nova-tech',
              merchantName: 'NovaTech',
              specs: {},
              warrantyMonths: 12,
              returnPolicyDays: 30
            },
            quantity: 1,
            unitPrice: 49.99,
            itemTotal: 49.99
          }
        ],
        subtotal: 49.99,
        discount: 0,
        shipping: 0,
        tax: 4.0,
        total: 53.99,
        currency: 'USD',
        updatedAt: new Date().toISOString()
      };

      const policy: ISpendingPolicy = {
        userId: testUserId,
        totalBudget: 1500,
        maxPricePerItem: 1000,
        maxCartValue: 1500,
        allowedCategories: [],
        restrictedCategories: [],
        approvedMerchants: [],
        maxQuantityPerItem: 4,
        requireCoApprovalAboveAmount: 1000,
        killSwitchActive: false
      };

      const risk = evaluateCartRisk(cart, policy);
      expect(risk.level).toBe('LOW');
      expect(risk.riskScore).toBeLessThan(25);
    });

    it('evaluates to CRITICAL risk when master emergency kill switch is engaged', () => {
      const cart: ICart = {
        id: 'cart-kill-01',
        userId: testUserId,
        version: 1,
        items: [],
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        currency: 'USD',
        updatedAt: new Date().toISOString()
      };

      const policy: ISpendingPolicy = {
        userId: testUserId,
        totalBudget: 1500,
        maxPricePerItem: 1000,
        maxCartValue: 1500,
        allowedCategories: [],
        restrictedCategories: [],
        approvedMerchants: [],
        maxQuantityPerItem: 4,
        requireCoApprovalAboveAmount: 1000,
        killSwitchActive: true // Kill switch active
      };

      const risk = evaluateCartRisk(cart, policy);
      expect(risk.level).toBe('CRITICAL');
      expect(risk.riskScore).toBe(100);
      expect(risk.heuristicReasons[0]).toContain('EMERGENCY KILL SWITCH ENGAGED');
    });

    it('evaluates to CRITICAL risk when cart total exceeds budget by > 50%', () => {
      const cart: ICart = {
        id: 'cart-excessive-01',
        userId: testUserId,
        version: 1,
        items: [
          {
            productId: 'prod-huge',
            productSnapshot: {
              id: 'prod-huge',
              title: 'Super Workstation',
              price: 4000.0,
              category: 'laptops',
              brand: 'Custom',
              merchantId: 'merch-liquidate-direct',
              merchantName: 'Direct Liquidators US',
              specs: {},
              warrantyMonths: 12,
              returnPolicyDays: 7
            },
            quantity: 1,
            unitPrice: 4000.0,
            itemTotal: 4000.0
          }
        ],
        subtotal: 4000.0,
        discount: 0,
        shipping: 0,
        tax: 320.0,
        total: 4320.0,
        currency: 'USD',
        updatedAt: new Date().toISOString()
      };

      const policy: ISpendingPolicy = {
        userId: testUserId,
        totalBudget: 2000, // Budget is 2000, cart total is 4320 (> 100% over)
        maxPricePerItem: 1500,
        maxCartValue: 2500,
        allowedCategories: [],
        restrictedCategories: [],
        approvedMerchants: [],
        maxQuantityPerItem: 4,
        requireCoApprovalAboveAmount: 1000,
        killSwitchActive: false
      };

      const risk = evaluateCartRisk(cart, policy);
      expect(risk.level).toBe('CRITICAL');
      expect(risk.riskScore).toBeGreaterThanOrEqual(75);
    });
  });

  describe('3. Red Team Arena Scenarios', () => {
    it('executes UNVERIFIED_WEBHOOK scenario and reports BLOCKED outcome', async () => {
      const res = await request(app)
        .post('/api/security/red-team/simulate')
        .set('Cookie', authCookie)
        .send({ scenarioId: 'UNVERIFIED_WEBHOOK' });

      expect(res.status).toBe(200);
      expect(res.body.simulation.outcome).toBe('BLOCKED');
      expect(res.body.simulation.caughtByLayer).toBe('AEGIS_WEBHOOK_VERIFIER');
      expect(res.body.simulation.title).toContain('Spoofed Webhook');
    });

    it('executes CONCURRENT_RACE_CAPTURE scenario and reports BLOCKED outcome', async () => {
      const res = await request(app)
        .post('/api/security/red-team/simulate')
        .set('Cookie', authCookie)
        .send({ scenarioId: 'CONCURRENT_RACE_CAPTURE' });

      expect(res.status).toBe(200);
      expect(res.body.simulation.outcome).toBe('BLOCKED');
      expect(res.body.simulation.caughtByLayer).toBe('AEGIS_PAYMENT_FINGERPRINT');
      expect(res.body.simulation.title).toContain('Concurrent Capture Race');
    });

    it('executes PRIVILEGED_TOOL_ESCALATION scenario and reports BLOCKED outcome', async () => {
      const res = await request(app)
        .post('/api/security/red-team/simulate')
        .set('Cookie', authCookie)
        .send({ scenarioId: 'PRIVILEGED_TOOL_ESCALATION' });

      expect(res.status).toBe(200);
      expect(res.body.simulation.outcome).toBe('BLOCKED');
      expect(res.body.simulation.caughtByLayer).toBe('AEGIS_TOOL_GATEWAY');
      expect(res.body.simulation.title).toContain('Privilege Escalation');
    });
  });

  describe('4. Modular Discovery Adapter Registry', () => {
    it('supports registering and querying custom merchant adapters', () => {
      const mockAdapter = {
        providerId: 'partner-test-feed',
        providerName: 'Partner Test Feed',
        isVerified: true,
        search: () => [
          {
            id: 'partner-item-1',
            title: 'Partner Verified Display',
            price: 299.99,
            currency: 'USD' as const,
            category: 'monitors' as const,
            brand: 'PartnerBrand',
            merchantId: 'partner-merch-01',
            merchantName: 'Partner Merchant',
            description: '4K IPS display from partner feed',
            specs: { resolution: '3840x2160' },
            availability: 'in_stock' as const,
            inventoryCount: 10,
            warrantyMonths: 24,
            returnPolicyDays: 30,
            images: [],
            rating: 4.8,
            reviewCount: 42,
            isSampleData: true as const
          }
        ]
      };

      discoveryRegistry.register(mockAdapter);
      const retrieved = discoveryRegistry.get('partner-test-feed');
      expect(retrieved).toBeDefined();
      expect(retrieved?.providerName).toBe('Partner Test Feed');

      const results = retrieved?.search({});
      expect(Array.isArray(results)).toBe(true);
      expect((results as any[])[0].title).toBe('Partner Verified Display');
    });
  });

  describe('5. Shopping Missions API', () => {
    it('creates a mission bundle and lists saved missions', async () => {
      const createRes = await request(app)
        .post('/api/missions/create')
        .set('Cookie', authCookie)
        .send({
          goal: 'Developer Machine under $1,200',
          targetBudget: 1200,
          categoriesNeeded: ['laptops', 'monitors']
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.mission.plans.length).toBe(3);

      const listRes = await request(app).get('/api/missions').set('Cookie', authCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.count).toBeGreaterThanOrEqual(1);
    });
  });
});

