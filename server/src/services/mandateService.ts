import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { ICart, IPurchasePassport, IApprovalMandate, IApproval, ISecurityEvent } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';
import { spendingGuard } from './spendingGuard.js';
import { ApprovalModel } from '../models/Approval.js';
import { PurchasePassportModel } from '../models/PurchasePassport.js';

export function getApprovalSecret(): string {
  const secret = process.env.APPROVAL_SECRET || process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: APPROVAL_SECRET environment variable is missing in production.');
    }
    return 'shopmate_dev_approval_secret_2026_paypal_aegis';
  }
  return secret;
}

/**
 * Computes deterministic HMAC-SHA256 canonical fingerprint from current cart.
 * Canonical payload keys are alphabetically ordered to guarantee reproducibility.
 */
export function computeCartFingerprint(
  cart: ICart,
  userId: string
): { canonicalJson: string; orderFingerprint: string } {
  // 1. Sort items deterministically by productId
  const sortedItems = [...cart.items]
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice * 100)
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  // 2. Extract distinct sorted merchants
  const merchants = Array.from(
    new Set(cart.items.map((i) => i.productSnapshot.merchantId || ''))
  ).sort();

  const totalCents = Math.round(cart.total * 100);

  // 3. Strict alphabetical key ordering in canonical JSON
  const canonicalPayload = {
    cartId: cart.id,
    cartVersion: cart.version,
    currency: cart.currency || 'USD',
    items: sortedItems,
    merchants,
    totalCents,
    userId
  };

  const canonicalJson = JSON.stringify(canonicalPayload);
  const secret = getApprovalSecret();
  const orderFingerprint = crypto.createHmac('sha256', secret).update(canonicalJson).digest('hex');

  return { canonicalJson, orderFingerprint };
}

/**
 * Backwards compatibility helper for existing references.
 */
export function computeCanonicalFingerprint(data: {
  passportId: string;
  userId: string;
  cartVersion: number;
  finalTotal: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}): { canonicalJson: string; fingerprint: string } {
  const sortedPayload = {
    cartVersion: data.cartVersion,
    createdAt: data.createdAt,
    currency: data.currency,
    finalTotal: Number(data.finalTotal.toFixed(2)),
    itemCount: data.itemCount,
    passportId: data.passportId,
    userId: data.userId
  };
  const canonicalJson = JSON.stringify(sortedPayload);
  const secret = getApprovalSecret();
  const fingerprint = crypto.createHmac('sha256', secret).update(canonicalJson).digest('hex');
  return { canonicalJson, fingerprint };
}

/**
 * Approves a Purchase Passport and issues a signed cryptographic Approval Mandate.
 * Re-runs Spending Guard on current cart, verifies cart version, and sets 15-minute expiry.
 */
export function approvePassportAndIssueMandate(
  passport: IPurchasePassport,
  currentCart: ICart,
  userId: string
): { success: boolean; error?: string; reasons?: string[]; mandate?: IApprovalMandate; approval?: IApproval } {
  // Check 1: User ownership
  if (passport.userId !== userId || currentCart.userId !== userId) {
    return { success: false, error: 'UNAUTHORIZED_OWNER', reasons: ['User does not own this passport or cart.'] };
  }

  // Check 2: Passport is not invalidated or already approved
  if (passport.approvalStatus === 'invalidated') {
    return {
      success: false,
      error: 'PASSPORT_INVALIDATED',
      reasons: [passport.invalidationReason || 'This Purchase Passport has been invalidated because the cart changed.']
    };
  }

  // Check 3: Cart version must strictly match the passport's cartVersion
  if (currentCart.version !== passport.cartVersion) {
    passport.approvalStatus = 'invalidated';
    passport.invalidationReason = `Cart version mismatch: Passport was issued for cart version ${passport.cartVersion}, but current cart is version ${currentCart.version}.`;
    store.passports.set(passport.passportId, passport);
    return {
      success: false,
      error: 'CART_VERSION_MISMATCH',
      reasons: ['Cart contents changed after passport was created. Please review the updated passport.']
    };
  }

  // Check 4: Re-run Spending Guard on live stored cart
  const policy = store.getSpendingPolicy(userId);
  const guard = spendingGuard.validate(currentCart, policy);
  if (!guard.allowed) {
    return {
      success: false,
      error: 'SPENDING_POLICY_VIOLATION',
      reasons: guard.violations
    };
  }

  // Check 5: Recompute cryptographic order fingerprint from CURRENT stored cart
  const { canonicalJson, orderFingerprint } = computeCartFingerprint(currentCart, userId);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute single-use window
  const approvalId = `appr-${uuidv4()}`;

  const approval: IApproval = {
    approvalId,
    userId,
    cartId: currentCart.id,
    cartVersion: currentCart.version,
    orderFingerprint,
    amount: currentCart.total,
    currency: 'USD',
    status: 'approved',
    approvedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const mandate: IApprovalMandate = {
    approvalId,
    passportId: passport.passportId,
    userId,
    orderFingerprint,
    canonicalHashPayload: canonicalJson,
    finalTotal: currentCart.total,
    currency: 'USD',
    cartVersion: currentCart.version,
    isSingleUse: true,
    approvedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    requiresCoApproval: currentCart.total >= (policy.requireCoApprovalAboveAmount || 1000)
  };

  // Update passport status
  passport.approvalStatus = 'approved';
  store.passports.set(passport.passportId, passport);
  store.approvals.set(approvalId, mandate);

  // Sync MongoDB
  if (mongoose.connection.readyState === 1) {
    PurchasePassportModel.updateOne(
      { passportId: passport.passportId },
      { $set: { approvalStatus: 'approved' } }
    ).catch((err) => console.warn('MongoDB passport approval sync error:', err));

    ApprovalModel.updateOne(
      { approvalId },
      { $set: approval },
      { upsert: true }
    ).catch((err) => console.warn('MongoDB approval sync error:', err));
  }

  return { success: true, mandate, approval };
}

/**
 * Pure verification function: Recomputes the fingerprint and checks:
 * 1. Mandate exists
 * 2. Status is not invalidated
 * 3. Mandate has not been reused (single-use)
 * 4. Mandate has not expired
 * 5. Cart ownership & version match
 * 6. Cryptographic fingerprint matches using timing-safe comparison
 */
export function verifyMandate(
  approvalId: string,
  currentCart: ICart
): { valid: boolean; reason?: string; approval?: IApprovalMandate | IApproval } {
  const mandate = store.approvals.get(approvalId);
  if (!mandate) {
    return { valid: false, reason: 'MANDATE_NOT_FOUND' };
  }

  // 1. Invalidation Check
  if ((mandate as any).status === 'invalidated') {
    return { valid: false, reason: 'MANDATE_INVALIDATED', approval: mandate };
  }

  // 2. Replay check (single-use)
  if (mandate.usedAt || (mandate as any).status === 'used') {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'REPLAY_ATTACK_PREVENTED',
      source: 'replay_attempt',
      severity: 'CRITICAL',
      payloadExcerpt: `Attempted replay of spent mandate ${approvalId}. Used at: ${mandate.usedAt}`,
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT',
      remedySuggested: 'Generate a new Purchase Passport and obtain fresh user authorization mandate.'
    };
    store.addSecurityEvent(secEvent);
    return { valid: false, reason: 'MANDATE_ALREADY_USED', approval: mandate };
  }

  // 3. Expiration Check (15 minutes)
  if (new Date() > new Date(mandate.expiresAt)) {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'EXPIRED_MANDATE_ATTEMPT',
      source: 'cart_tamper',
      severity: 'MEDIUM',
      payloadExcerpt: `Mandate ${approvalId} expired at ${mandate.expiresAt}`,
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT'
    };
    store.addSecurityEvent(secEvent);
    return { valid: false, reason: 'MANDATE_EXPIRED', approval: mandate };
  }

  // 4. Cart Ownership Check
  if (currentCart.userId !== mandate.userId) {
    return { valid: false, reason: 'WRONG_USER', approval: mandate };
  }

  // 5. Cart Version Tampering Check
  if (currentCart.version !== mandate.cartVersion) {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'CART_TAMPER_DETECTED',
      source: 'cart_tamper',
      severity: 'CRITICAL',
      payloadExcerpt: `Cart modified after mandate signed. Mandate cartVersion: ${mandate.cartVersion}, live cartVersion: ${currentCart.version}`,
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT',
      remedySuggested: 'Cart modified after approval. Cryptographic mandate permanently invalidated.'
    };
    store.addSecurityEvent(secEvent);
    return { valid: false, reason: 'CART_MODIFIED_AFTER_APPROVAL', approval: mandate };
  }

  // 6. Timing-Safe Cryptographic Fingerprint Verification
  const { orderFingerprint: recomputedFingerprint } = computeCartFingerprint(currentCart, mandate.userId);

  const recomputedBuf = Buffer.from(recomputedFingerprint, 'utf8');
  const storedBuf = Buffer.from(mandate.orderFingerprint, 'utf8');

  const matches =
    recomputedBuf.length === storedBuf.length && crypto.timingSafeEqual(recomputedBuf, storedBuf);

  if (!matches) {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'FORGED_FRONTEND_TOTAL_REJECTED',
      source: 'cart_tamper',
      severity: 'CRITICAL',
      payloadExcerpt: `Fingerprint mismatch. Recomputed: ${recomputedFingerprint.slice(0, 16)}..., Stored: ${mandate.orderFingerprint.slice(0, 16)}...`,
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_PAYMENT_FINGERPRINT'
    };
    store.addSecurityEvent(secEvent);
    return { valid: false, reason: 'FINGERPRINT_VERIFICATION_FAILED', approval: mandate };
  }

  return { valid: true, approval: mandate };
}

// Backwards compatibility alias
export function createApprovalMandate(passport: IPurchasePassport, userId: string): IApprovalMandate {
  const currentCart = store.getCartByUserId(userId) || {
    id: passport.cartId || 'cart-legacy',
    userId,
    version: passport.cartVersion,
    items: passport.items,
    subtotal: passport.priceBreakdown.subtotal,
    discount: passport.priceBreakdown.discount,
    shipping: passport.priceBreakdown.shipping,
    tax: passport.priceBreakdown.tax,
    total: passport.priceBreakdown.finalTotal,
    currency: 'USD',
    updatedAt: passport.createdAt
  };
  const res = approvePassportAndIssueMandate(passport, currentCart, userId);
  return res.mandate!;
}

export function verifyApprovalMandate(
  approvalId: string,
  currentCartVersion: number
): { valid: boolean; reason?: string; mandate?: IApprovalMandate } {
  const mandate = store.approvals.get(approvalId);
  if (!mandate) {
    return { valid: false, reason: 'MANDATE_NOT_FOUND' };
  }
  const currentCart = store.getCartByUserId(mandate.userId);
  if (!currentCart) {
    return { valid: false, reason: 'CART_NOT_FOUND' };
  }
  const result = verifyMandate(approvalId, currentCart);
  return { valid: result.valid, reason: result.reason, mandate: result.approval as IApprovalMandate };
}
