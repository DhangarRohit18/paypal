import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  IUser,
  IProduct,
  IMerchant,
  ICart,
  IMission,
  IPurchasePassport,
  IApprovalMandate,
  ISpendingPolicy,
  ISecurityEvent,
  IAgentEvent,
  IOrder,
  IResolutionRequest,
  IShoppingAgent,
  IMemoryProfile,
  IConversation,
  IWebhookEvent,
  ICoApproverShare
} from '../../../shared/types.js';
import { SAMPLE_PRODUCTS, SAMPLE_MERCHANTS } from '../seed/sampleCatalogue.js';

export interface UserRecord extends IUser {
  passwordHash: string;
}

export class InMemoryStore {
  users: Map<string, UserRecord> = new Map();
  carts: Map<string, ICart> = new Map(); // key: userId
  missions: Map<string, IMission> = new Map();
  passports: Map<string, IPurchasePassport> = new Map();
  approvals: Map<string, IApprovalMandate> = new Map();
  orders: Map<string, IOrder> = new Map();
  resolutions: Map<string, IResolutionRequest> = new Map();
  securityEvents: ISecurityEvent[] = [];
  agentEvents: IAgentEvent[] = [];
  spendingPolicies: Map<string, ISpendingPolicy> = new Map(); // key: userId
  agents: Map<string, IShoppingAgent[]> = new Map(); // key: userId
  memoryProfiles: Map<string, IMemoryProfile> = new Map(); // key: userId
  savedProducts: Map<string, string[]> = new Map(); // key: userId -> productIds
  conversations: Map<string, IConversation> = new Map(); // key: conversationId
  products: IProduct[] = [...SAMPLE_PRODUCTS];
  merchants: IMerchant[] = [...SAMPLE_MERCHANTS];
  paypalTokenCache: { token: string; expiresAt: number } | null = null;
  webhookEvents: Map<string, IWebhookEvent> = new Map(); // key: eventId
  coApproverShares: Map<string, ICoApproverShare> = new Map(); // key: token

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    // Salt rounds: 10
    const demoPasswordHash = bcrypt.hashSync('DemoPass123!', 10);
    const adminPasswordHash = bcrypt.hashSync('AdminPass123!', 10);

    const demoUser: UserRecord = {
      userId: 'usr-demo-shopper-001',
      email: 'demo@shopmate.ai',
      name: 'Jane Doe',
      role: 'user',
      createdAt: new Date().toISOString(),
      passwordHash: demoPasswordHash
    };
    this.users.set(demoUser.userId, demoUser);
    this.initUserRecords(demoUser.userId);

    const adminUser: UserRecord = {
      userId: 'usr-admin-aegis-001',
      email: 'admin@shopmate.ai',
      name: 'Alex Vance (AEGIS Security)',
      role: 'admin',
      createdAt: new Date().toISOString(),
      passwordHash: adminPasswordHash
    };
    this.users.set(adminUser.userId, adminUser);
    this.initUserRecords(adminUser.userId);

    // Give demo user a saved product for rich dashboard initial state
    this.savedProducts.set(demoUser.userId, ['prod-lap-zenbook-pro', 'prod-mon-prism-27-4k']);
  }

  // Initializes default AEGIS records for a user upon registration
  initUserRecords(userId: string) {
    // 1. Spending policy
    if (!this.spendingPolicies.has(userId)) {
      this.spendingPolicies.set(userId, this.createDefaultPolicy(userId));
    }

    // 2. Shopping Agent (active, scoped permissions)
    if (!this.agents.has(userId)) {
      const defaultAgent: IShoppingAgent = {
        agentId: uuidv4(),
        userId,
        name: 'BUYWISE Shopping Co-Pilot',
        role: 'Autonomous Hardware Research & FitCheck Agent',
        status: 'active',
        scopedPermissions: ['read_catalogue', 'evaluate_fit', 'prepare_cart', 'request_approval'],
        maxDailyBudget: 2500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.agents.set(userId, [defaultAgent]);
    }

    // 3. ShopMate Memory Profile (Personalization OFF by default)
    if (!this.memoryProfiles.has(userId)) {
      const defaultMemory: IMemoryProfile = {
        userId,
        personalizationEnabled: false, // OFF by default as required
        preferredCategories: [],
        brandAffinities: [],
        notes: [],
        updatedAt: new Date().toISOString()
      };
      this.memoryProfiles.set(userId, defaultMemory);
    }

    // 4. Saved products list
    if (!this.savedProducts.has(userId)) {
      this.savedProducts.set(userId, []);
    }
  }

  createDefaultPolicy(userId: string): ISpendingPolicy {
    return {
      userId,
      totalBudget: 2500,
      maxPricePerItem: 1500,
      maxCartValue: 2500,
      allowedCategories: [],
      restrictedCategories: [],
      approvedMerchants: [],
      maxQuantityPerItem: 4,
      requireCoApprovalAboveAmount: 1000,
      killSwitchActive: false
    };
  }

  getUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): UserRecord | undefined {
    return Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  getProductById(id: string): IProduct | undefined {
    return this.products.find(p => p.id === id);
  }

  getCartByUserId(userId: string): ICart | undefined {
    return this.carts.get(userId);
  }

  getSpendingPolicy(userId: string): ISpendingPolicy {
    let policy = this.spendingPolicies.get(userId);
    if (!policy) {
      policy = this.createDefaultPolicy(userId);
      this.spendingPolicies.set(userId, policy);
    }
    return policy;
  }

  getAgentsByUserId(userId: string): IShoppingAgent[] {
    const list = this.agents.get(userId);
    if (!list || list.length === 0) {
      this.initUserRecords(userId);
      return this.agents.get(userId) || [];
    }
    return list;
  }

  getMemoryProfile(userId: string): IMemoryProfile {
    let profile = this.memoryProfiles.get(userId);
    if (!profile) {
      this.initUserRecords(userId);
      profile = this.memoryProfiles.get(userId)!;
    }
    return profile;
  }

  getSavedProductIds(userId: string): string[] {
    return this.savedProducts.get(userId) || [];
  }

  toggleSaveProduct(userId: string, productId: string): boolean {
    const current = this.getSavedProductIds(userId);
    const index = current.indexOf(productId);
    let isSaved = false;
    if (index >= 0) {
      current.splice(index, 1);
      isSaved = false;
    } else {
      current.push(productId);
      isSaved = true;
    }
    this.savedProducts.set(userId, current);
    return isSaved;
  }

  getConversationById(id: string): IConversation | undefined {
    return this.conversations.get(id);
  }

  getConversationsByUserId(userId: string): IConversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  saveConversation(conv: IConversation): void {
    this.conversations.set(conv.conversationId, conv);
  }

  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }

  addSecurityEvent(event: ISecurityEvent): void {
    this.securityEvents.unshift(event);
    if (this.securityEvents.length > 500) {
      this.securityEvents.pop();
    }
  }

  addAgentEvent(event: IAgentEvent): void {
    this.agentEvents.unshift(event);
    if (this.agentEvents.length > 500) {
      this.agentEvents.pop();
    }
  }
}

export const store = new InMemoryStore();
