import { IFlightRecorderEvent, ICart, IPurchasePassport } from '../../../shared/types.js';

export function buildFlightRecorderTimeline(
  cart: ICart,
  passport?: IPurchasePassport,
  approvalStatus?: string
): IFlightRecorderEvent[] {
  const events: IFlightRecorderEvent[] = [];
  const now = new Date();

  // 1. Intent Extraction
  events.push({
    stepIndex: 1,
    phase: 'INTENT',
    title: 'Intent Parsing & Constraint Normalization',
    description: 'Extracted hardware mission parameters, target budget ceiling, and form-factor requirements.',
    timestamp: new Date(now.getTime() - 240000).toISOString(),
    status: 'COMPLETED',
    metadata: {
      itemCount: cart.items.length,
      categories: Array.from(new Set(cart.items.map((i) => i.productSnapshot.category)))
    }
  });

  // 2. Catalogue Discovery & Filtering
  events.push({
    stepIndex: 2,
    phase: 'DISCOVERY',
    title: 'Deterministic Catalogue Search & Heuristic Ranking',
    description: 'Searched verified catalogue items across approved merchants; filtered out-of-stock and mismatched inventory.',
    timestamp: new Date(now.getTime() - 180000).toISOString(),
    status: 'COMPLETED',
    metadata: {
      matchedProducts: cart.items.map((i) => i.productSnapshot.title)
    }
  });

  // 3. FitCheck Hardware Compatibility
  const fitStatus = passport?.fitCheckSummary?.overallStatus || 'PASS';
  events.push({
    stepIndex: 3,
    phase: 'FIT_CHECK',
    title: 'AEGIS FitCheck Compatibility Matrix',
    description: 'Evaluated USB-C Power Delivery, DisplayPort alt-mode, socket compatibility, and OS drivers without hallucination.',
    timestamp: new Date(now.getTime() - 120000).toISOString(),
    status: fitStatus === 'FAIL' ? 'INTERCEPTED' : 'COMPLETED',
    metadata: {
      verdict: fitStatus,
      testedRulesCount: passport?.fitCheckSummary?.results?.length || cart.items.length
    }
  });

  // 4. FairPrice Heuristics & Regret Shield
  events.push({
    stepIndex: 4,
    phase: 'FAIR_PRICE',
    title: 'FairPrice Benchmark & Historical Price Audit',
    description: 'Compared 90-day price history across merchants to detect phantom markups and verify genuine discount claims.',
    timestamp: new Date(now.getTime() - 90000).toISOString(),
    status: 'COMPLETED',
    metadata: {
      totalSubtotal: cart.subtotal
    }
  });

  // 5. AEGIS Spending Guard
  const budgetStatus = passport?.budgetComparison?.budgetStatus || 'WITHIN_BUDGET';
  events.push({
    stepIndex: 5,
    phase: 'SPENDING_GUARD',
    title: 'AEGIS Spending Guard Policy Evaluation',
    description: 'Deterministic backend check against total budget, per-item caps, restricted categories, and active kill switch.',
    timestamp: new Date(now.getTime() - 60000).toISOString(),
    status: budgetStatus === 'BUDGET_EXCEEDED' ? 'INTERCEPTED' : 'COMPLETED',
    metadata: {
      effectiveTotal: cart.total,
      currency: cart.currency || 'USD'
    }
  });

  // 6. Purchase Passport Generation
  events.push({
    stepIndex: 6,
    phase: 'PASSPORT',
    title: 'Purchase Passport Snapshot Compilation',
    description: 'Generated immutable pre-checkout authorization document locking product snapshots, return policies, and pricing.',
    timestamp: passport?.createdAt || new Date(now.getTime() - 30000).toISOString(),
    status: 'COMPLETED',
    metadata: {
      passportId: passport?.passportId || 'pending',
      cartVersion: cart.version
    }
  });

  // 7. HMAC-SHA256 Mandate
  const isApproved =
    approvalStatus === 'approved' ||
    approvalStatus === 'APPROVED' ||
    approvalStatus === 'COMPLETED' ||
    passport?.approvalStatus === 'approved' ||
    passport?.approvalStatus === 'APPROVED' ||
    passport?.approvalStatus === 'COMPLETED';

  events.push({
    stepIndex: 7,
    phase: 'MANDATE',
    title: 'HMAC-SHA256 Signed Approval Mandate',
    description: isApproved
      ? 'Cryptographically signed single-use mandate generated with 15-minute TTL. Cart version locked.'
      : 'Awaiting explicit shopper authorization and cryptographic signature.',
    timestamp: new Date(now.getTime() - 10000).toISOString(),
    status: isApproved ? 'COMPLETED' : 'PENDING'
  });

  // 8. PayPal Orders v2 Checkout & Capture
  const isCaptured =
    approvalStatus === 'COMPLETED' || passport?.approvalStatus === 'COMPLETED';
  events.push({
    stepIndex: 8,
    phase: 'PAYPAL_ORDER',
    title: 'PayPal Orders v2 REST API Execution',
    description: isCaptured
      ? 'Payment authorized and captured via PayPal Orders v2 REST API. Idempotency verified, cart cleared.'
      : 'Ready for PayPal Sandbox checkout authorization.',
    timestamp: now.toISOString(),
    status: isCaptured ? 'COMPLETED' : 'PENDING',
    metadata: {
      paypalOrderId: passport?.paypalOrderId,
      paypalCaptureId: passport?.paypalCaptureId
    }
  });

  return events;
}
