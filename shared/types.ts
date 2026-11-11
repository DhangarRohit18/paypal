// ============================================================================
// SHOPMATE AI & PAYPAL AEGIS — SHARED TYPE DEFINITIONS
// Core principle: The LLM suggests, deterministic backend code decides.
// ============================================================================

export type UserRole = 'user' | 'admin';

export interface IUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface IShoppingAgent {
  agentId: string;
  userId: string;
  name: string;
  role: string;
  status: 'active' | 'paused';
  scopedPermissions: string[];
  maxDailyBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMemoryProfile {
  userId: string;
  personalizationEnabled: boolean; // default false
  preferredCategories: string[];
  brandAffinities: string[];
  notes: string[];
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Product & Merchant Catalogue (Always labelled Sample Data)
// ----------------------------------------------------------------------------

export interface ISamplePriceHistory {
  date: string;
  price: number;
  merchantName: string;
}

export interface ICompatibilityMeta {
  platform?: string[];
  cpuSocket?: string;
  ramType?: string;
  portsRequired?: string[];
  powerDeliveryWatts?: number;
  lensMount?: string;
  osCompatibility?: string[];
}

export interface IProduct {
  id: string;
  title: string;
  name?: string; // alias for title
  category:
    | 'laptops'
    | 'smartphones'
    | 'headphones'
    | 'monitors'
    | 'keyboards'
    | 'mice'
    | 'gaming_accessories'
    | 'cameras'
    | 'smart_home';
  brand: string;
  price: number;
  currency: 'USD';
  originalListPrice?: number;
  merchantId: string;
  merchantName: string;
  description: string;
  specs: Record<string, any>;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  inventoryCount: number;
  warrantyMonths: number;
  returnPolicyDays: number;
  returnPolicy?: { days: number; conditions: string };
  compatibilityMeta?: ICompatibilityMeta;
  images: string[];
  imageUrl?: string; // primary image alias
  samplePriceHistory?: ISamplePriceHistory[];
  rating: number;
  reviewCount: number;
  source?: 'sample';
  isSampleData: true;
  isMaliciousSample?: boolean;
  isSecurityTestFixture?: boolean;
  maliciousPayloadExcerpt?: string;
}

export interface IMerchant {
  id: string;
  name: string;
  trustRating: number; // 0-100
  policyClarity: 'High' | 'Medium' | 'Low';
  returnDays: number;
  contactEmail: string;
  isVerified: boolean;
  country: string;
}

// ----------------------------------------------------------------------------
// Shopping Cart & Line Items
// ----------------------------------------------------------------------------

export interface ICartItem {
  productId: string;
  productSnapshot: {
    id: string;
    title: string;
    price: number;
    category: string;
    brand: string;
    merchantId: string;
    merchantName: string;
    specs: Record<string, any>;
    warrantyMonths: number;
    returnPolicyDays: number;
  };
  quantity: number;
  unitPrice: number;
  itemTotal: number;
}

export interface ICart {
  id: string;
  userId: string;
  version: number; // Increments on any modification to invalidate prior passports
  items: ICartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: 'USD';
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Mission & Requirements
// ----------------------------------------------------------------------------

export interface IIntentBudget {
  amount: number;
  currency: 'USD';
}

export interface IUnderstoodRequirements {
  categories: string[];
  category?: string; // helper alias = categories[0]
  budget: IIntentBudget;
  budgetLimit: number; // helper alias = budget.amount
  specs: Record<string, any>;
  requiredSpecs: Record<string, any>;
  brandsInclude: string[];
  preferredBrands: string[];
  brandsExclude: string[];
  excludedBrands: string[];
  intendedUse: string;
  targetUse: string;
  excludedProducts: string[];
  missingInfo: string[];
  mustHaveFeatures: string[];
  clarifyingQuestion: string | null;
  clarificationAnswered?: string;
}

export interface IChatMessage {
  messageId: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system' | 'aegis';
  content: string;
  products?: IProduct[];
  agentMode?: 'ai_llm' | 'offline_rule_based' | 'aegis_quarantine';
  requirements?: IUnderstoodRequirements;
  createdAt: string;
}

export interface IConversation {
  conversationId: string;
  userId: string;
  title: string;
  understoodRequirements: IUnderstoodRequirements;
  messages: IChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IBundlePlan {
  planId: 'budget_optimized' | 'best_value' | 'premium_performance';
  name: string;
  tagline: string;
  items: Array<{
    product: IProduct;
    quantity: number;
    fitCheckScore: number;
    fitReason: string;
  }>;
  totalCost: number;
  savingsVsBudget: number;
  explanation: string;
  tradeOffSummary: string;
}

export interface IMission {
  id: string;
  userId: string;
  goal: string; // e.g. "AI development workstation under $1,000"
  targetBudget: number;
  status: 'active' | 'evaluating' | 'plans_ready' | 'cart_proposed' | 'checkout_ready' | 'completed';
  understoodRequirements: IUnderstoodRequirements;
  plans: IBundlePlan[];
  selectedPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// FitCheck, FairPrice & TrustScore (Explainable Heuristics)
// ----------------------------------------------------------------------------

export interface IFitCheckItemResult {
  targetId: string;
  pairedWithId?: string;
  status: 'Compatible' | 'Incompatible' | 'Needs verification' | 'Missing spec';
  reason: string;
  checkedRules: string[];
}

export interface IFairPriceEvaluation {
  productId: string;
  currentPrice: number;
  listPrice?: number;
  fairPriceRange: { min: number; max: number };
  verdict: 'Fair Price' | 'Good Deal' | 'Overpriced' | 'Unverified List Price';
  effectiveCost: number; // price + estimated shipping
  priceHistorySample: ISamplePriceHistory[];
  notes: string;
}

export interface ITrustIndicator {
  name: string;
  score: number; // 0-100
  label: 'VERIFIED' | 'ESTIMATED' | 'UNKNOWN';
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  missingInfoList: string[];
}

// ----------------------------------------------------------------------------
// Signature Feature: Purchase Passport & Signed Approval Mandate
// ----------------------------------------------------------------------------

export interface IPurchasePassport {
  passportId: string;
  version: number;
  userId: string;
  cartId?: string;
  cartVersion: number;
  items: ICartItem[];
  missionGoal?: string;
  understoodRequirements?: IUnderstoodRequirements;
  merchantInfo: Array<{
    merchantId: string;
    merchantName: string;
    trustRating: number;
    returnDays: number;
  }>;
  priceBreakdown: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    finalTotal: number;
    currency: 'USD';
  };
  budgetComparison: {
    userBudgetLimit: number;
    actualTotal: number;
    underBudgetBy: number;
    budgetStatus: 'WITHIN_BUDGET' | 'BUDGET_EXCEEDED';
  };
  fitCheckSummary: {
    overallStatus: 'PASS' | 'WARNING' | 'FAIL';
    results: IFitCheckItemResult[];
  };
  trustScoreOverall: {
    score: number;
    indicators: ITrustIndicator[];
  };
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    heuristicReasons: string[];
    recommendedAction: string;
  };
  recommendationReasoning: string[];
  alternativesConsidered: Array<{
    originalTitle: string;
    alternativeTitle: string;
    priceDelta: number;
    specDifference: string;
  }>;
  warrantyReturnSummary: Array<{
    productTitle: string;
    warrantyMonths: number;
    returnDays: number;
  }>;
  agentActivityCount: number;
  approvalStatus:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'invalidated'
    | 'consumed'
    | 'DRAFT'
    | 'CO_APPROVAL_PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'COMPLETED'
    | 'INVALIDATED';
  invalidationReason?: string;
  coApproverToken?: string;
  coApproverEmail?: string;
  coApprovedBy?: string;
  createdAt: string;
  expiresAt: string;
}

export interface IApprovalMandate {
  approvalId: string;
  passportId: string;
  userId: string;
  orderFingerprint: string; // HMAC-SHA256(canonical JSON)
  canonicalHashPayload: string;
  finalTotal: number;
  currency: 'USD';
  cartVersion: number;
  isSingleUse: true;
  usedAt?: string;
  approvedAt: string;
  expiresAt: string;
  requiresCoApproval: boolean;
  coApprovedAt?: string;
}

export interface IApproval {
  approvalId: string;
  userId: string;
  cartId: string;
  cartVersion: number;
  orderFingerprint: string;
  amount: number;
  currency: 'USD';
  status: 'approved' | 'used' | 'invalidated' | 'expired';
  expiresAt: string;
  usedAt?: string;
  approvedAt: string;
}

// ----------------------------------------------------------------------------
// AEGIS: Spending Guard, Permissions, Ledger & Red Team
// ----------------------------------------------------------------------------

export interface ISpendingPolicy {
  userId: string;
  totalBudget: number;
  maxPricePerItem: number;
  maxCartValue: number;
  allowedCategories: string[];
  restrictedCategories: string[];
  approvedMerchants: string[];
  maxQuantityPerItem: number;
  requireCoApprovalAboveAmount: number;
  killSwitchActive: boolean;
}

export interface ISecurityEvent {
  id: string;
  timestamp: string;
  eventType:
    | 'PROMPT_INJECTION_DETECTED'
    | 'BUDGET_LIMIT_BREACH'
    | 'CART_TAMPER_DETECTED'
    | 'EXPIRED_MANDATE_ATTEMPT'
    | 'REPLAY_ATTACK_PREVENTED'
    | 'KILL_SWITCH_BLOCKED_ACTION'
    | 'FORGED_FRONTEND_TOTAL_REJECTED';
  source: 'product_description' | 'user_input' | 'cart_tamper' | 'replay_attempt' | 'rate_limit';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  payloadExcerpt: string;
  actionTaken: 'BLOCKED' | 'SANITIZED' | 'FLAGGED';
  defenceLayer: 'AEGIS_TOOL_GATEWAY' | 'AEGIS_INPUT_SCANNER' | 'AEGIS_PAYMENT_FINGERPRINT' | 'AEGIS_KILL_SWITCH';
  remedySuggested?: string;
}

export interface IAgentEvent {
  id: string;
  timestamp: string;
  agentId: 'intent' | 'research' | 'orchestrator' | 'resolve' | 'aegis';
  action: string;
  toolName?: string;
  inputSummary: string;
  outputSummary: string;
  permissionCheck: 'PASSED' | 'DENIED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IRedTeamScenario {
  id: string;
  title: string;
  description: string;
  attackCategory: 'POISONED_PRODUCT' | 'BUDGET_BYPASS' | 'CART_TAMPER' | 'REPLAY_CAPTURE' | 'EXPIRED_APPROVAL' | 'FORGED_AMOUNT';
  simulatedPayload: any;
  expectedCatchLayer: string;
  expectedOutcome: 'BLOCKED';
}

// ----------------------------------------------------------------------------
// Real PayPal Sandbox Checkout & Orders
// ----------------------------------------------------------------------------

export interface IPayPalOrderPayload {
  passportId: string;
  approvalId: string;
  orderFingerprint: string;
}

export interface IPayPalOrderResponse {
  paypalOrderId: string;
  approveUrl: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED';
  finalAmount: string;
  currency: 'USD';
  idempotencyKey: string;
}

export interface IPayPalCaptureResponse {
  paypalOrderId: string;
  captureId: string;
  status: 'COMPLETED' | 'DECLINED' | 'FAILED';
  amountCaptured: string;
  currency: 'USD';
  payerEmail?: string;
  orderId: string;
}

export interface IOrder {
  orderId: string;
  userId: string;
  passportId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  items: ICartItem[];
  totalAmount: number;
  currency: 'USD';
  status: 'PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'REFUND_REQUESTED' | 'REFUNDED';
  returnDeadlineDate: string;
  warrantyEndDate: string;
  placedAt: string;
}

export interface IResolutionRequest {
  id: string;
  orderId: string;
  userId: string;
  requestType: 'RETURN' | 'WARRANTY_CLAIM' | 'POLICY_INQUIRY';
  reason: string;
  status: 'DRAFT_PREPARED' | 'OFFICIALLY_SUBMITTED_TO_MERCHANT' | 'RESOLVED';
  guidanceText: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Second Opinion (Why Not? + Regret Shield)
// ----------------------------------------------------------------------------

export interface ISecondOpinionReport {
  meetsRequirements: boolean;
  cheaperSufficientAlternative?: {
    originalProduct: IProduct;
    recommendedAlternative: IProduct;
    priceSavings: number;
    specComparison: Record<string, { original: any; alternative: any }>;
    whySufficient: string;
  };
  payingForUnneededFeatures: string[];
  weakPoliciesFlagged: string[];
  overallVerdict: 'RECOMMENDED' | 'CAUTION_BETTER_OPTION_EXISTS' | 'SUBSTANTIAL_SAVINGS_AVAILABLE';
  confidenceScore: number;
}

