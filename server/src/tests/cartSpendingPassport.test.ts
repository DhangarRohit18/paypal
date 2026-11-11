import { describe, it, expect, beforeEach } from 'vitest';
import { computeCartTotals } from '../services/cartService.js';
import { spendingGuard } from '../services/spendingGuard.js';
import {
  computeCartFingerprint,
  verifyMandate,
  approvePassportAndIssueMandate
} from '../services/mandateService.js';
import { generatePassport } from '../services/passportService.js';
import { ICart, ISpendingPolicy, IPurchasePassport } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';

describe('Phase 4: Cart Service & Integer Cent Arithmetic', () => {
  it('computes subtotal, tax, shipping, and total strictly in integer cents', () => {
    // 3 items with fractional floating-point representations: e.g. 19.99 * 3 = 59.97
    const items: any[] = [
      { productId: 'item-1', unitPrice: 19.99, quantity: 3, itemTotal: 59.97 },
      { productId: 'item-2', unitPrice: 49.95, quantity: 1, itemTotal: 49.95 }
    ];

    const totals = computeCartTotals(items);
    // Subtotal: 59.97 + 49.95 = 109.92 (>= 100 so free shipping)
    expect(totals.subtotal).toBe(109.92);
    expect(totals.shipping).toBe(0);
    // Tax: 109.92 * 0.08 = 8.7936 -> 8.79
    expect(totals.tax).toBe(8.79);
    // Total: 109.92 + 8.79 = 118.71
    expect(totals.total).toBe(118.71);
  });

  it('charges $9.99 shipping when subtotal is below $100', () => {
    const items: any[] = [
      { productId: 'item-small', unitPrice: 25.0, quantity: 1, itemTotal: 25.0 }
    ];
    const totals = computeCartTotals(items);
    expect(totals.subtotal).toBe(25.0);
    expect(totals.shipping).toBe(9.99);
    expect(totals.tax).toBe(2.0); // 25 * 0.08
    expect(totals.total).toBe(36.99);
  });
});

describe('Phase 4: Spending Guard Deterministic Policy Enforcement', () => {
  const policy: ISpendingPolicy = {
    userId: 'test-user',
    totalBudget: 1000,
    maxPricePerItem: 600,
    maxCartValue: 1000,
    allowedCategories: [],
    restrictedCategories: ['smartphones'],
    approvedMerchants: ['merch-nova-tech', 'merch-apex-gear'],
    maxQuantityPerItem: 3,
    requireCoApprovalAboveAmount: 800,
    killSwitchActive: false
  };

  it('passes a compliant cart within all policy limits', () => {
    const cart: ICart = {
      id: 'cart-1',
      userId: 'test-user',
      version: 1,
      items: [
        {
          productId: 'prod-1',
          productSnapshot: {
            id: 'prod-1',
            title: 'Wireless Keyboard',
            price: 150,
            category: 'keyboards',
            brand: 'Keychron',
            merchantId: 'merch-nova-tech',
            merchantName: 'NovaTech',
            specs: {},
            warrantyMonths: 12,
            returnPolicyDays: 30
          },
          quantity: 2,
          unitPrice: 150,
          itemTotal: 300
        }
      ],
      subtotal: 300,
      discount: 0,
      shipping: 0,
      tax: 24,
      total: 324,
      currency: 'USD',
      updatedAt: new Date().toISOString()
    };

    const res = spendingGuard.validate(cart, policy);
    expect(res.allowed).toBe(true);
    expect(res.violations.length).toBe(0);
  });

  it('blocks cart exceeding totalBudget / maxCartValue with plain-language explanation and suggested fix', () => {
    const cart: ICart = {
      id: 'cart-2',
      userId: 'test-user',
      version: 1,
      items: [
        {
          productId: 'prod-big',
          productSnapshot: {
            id: 'prod-big',
            title: 'Ultra Gaming Monitor',
            price: 550,
            category: 'monitors',
            brand: 'Asus',
            merchantId: 'merch-nova-tech',
            merchantName: 'NovaTech',
            specs: {},
            warrantyMonths: 24,
            returnPolicyDays: 30
          },
          quantity: 2,
          unitPrice: 550,
          itemTotal: 1100
        }
      ],
      subtotal: 1100,
      discount: 0,
      shipping: 0,
      tax: 88,
      total: 1188,
      currency: 'USD',
      updatedAt: new Date().toISOString()
    };

    const res = spendingGuard.validate(cart, policy);
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain('exceeds allowable spending limit');
    expect(res.suggestedFixes.length).toBeGreaterThan(0);
    expect(res.suggestedFixes[0]).toContain('Ultra Gaming Monitor');
  });

  it('blocks item exceeding maxPricePerItem', () => {
    const cart: ICart = {
      id: 'cart-3',
      userId: 'test-user',
      version: 1,
      items: [
        {
          productId: 'prod-exp',
          productSnapshot: {
            id: 'prod-exp',
            title: 'High-End Workstation Laptop',
            price: 750,
            category: 'laptops',
            brand: 'Dell',
            merchantId: 'merch-nova-tech',
            merchantName: 'NovaTech',
            specs: {},
            warrantyMonths: 12,
            returnPolicyDays: 30
          },
          quantity: 1,
          unitPrice: 750,
          itemTotal: 750
        }
      ],
      subtotal: 750,
      discount: 0,
      shipping: 0,
      tax: 60,
      total: 810,
      currency: 'USD',
      updatedAt: new Date().toISOString()
    };

    const res = spendingGuard.validate(cart, policy);
    expect(res.allowed).toBe(false);
    expect(res.violations.some((v) => v.includes('exceeds maximum per-item limit'))).toBe(true);
    expect(res.suggestedFixes.some((f) => f.includes('priced under $600.00'))).toBe(true);
  });

  it('blocks restricted categories and unapproved merchants', () => {
    const cart: ICart = {
      id: 'cart-4',
      userId: 'test-user',
      version: 1,
      items: [
        {
          productId: 'prod-phone',
          productSnapshot: {
            id: 'prod-phone',
            title: 'Flagship Smartphone',
            price: 400,
            category: 'smartphones',
            brand: 'Google',
            merchantId: 'merch-unapproved',
            merchantName: 'Unknown Boutique',
            specs: {},
            warrantyMonths: 12,
            returnPolicyDays: 14
          },
          quantity: 1,
          unitPrice: 400,
          itemTotal: 400
        }
      ],
      subtotal: 400,
      discount: 0,
      shipping: 0,
      tax: 32,
      total: 432,
      currency: 'USD',
      updatedAt: new Date().toISOString()
    };

    const res = spendingGuard.validate(cart, policy);
    expect(res.allowed).toBe(false);
    expect(res.violations.some((v) => v.includes('strictly restricted'))).toBe(true);
    expect(res.violations.some((v) => v.includes('pre-approved merchant list'))).toBe(true);
  });
});

describe('Phase 4: Cryptographic Mandate Fingerprint & Verification', () => {
  const dummyCart: ICart = {
    id: 'cart-fingerprint-test',
    userId: 'usr-shopper-001',
    version: 1,
    items: [
      {
        productId: 'prod-kb-01',
        productSnapshot: {
          id: 'prod-kb-01',
          title: 'Mechanical Keyboard',
          price: 120,
          category: 'keyboards',
          brand: 'Keychron',
          merchantId: 'merch-nova-tech',
          merchantName: 'NovaTech',
          specs: {},
          warrantyMonths: 12,
          returnPolicyDays: 30
        },
        quantity: 1,
        unitPrice: 120,
        itemTotal: 120
      }
    ],
    subtotal: 120,
    discount: 0,
    shipping: 0,
    tax: 9.6,
    total: 129.6,
    currency: 'USD',
    updatedAt: new Date().toISOString()
  };

  it('computes deterministic orderFingerprint for identical carts', () => {
    const res1 = computeCartFingerprint(dummyCart, 'usr-shopper-001');
    const res2 = computeCartFingerprint(dummyCart, 'usr-shopper-001');

    expect(res1.orderFingerprint).toBe(res2.orderFingerprint);
    expect(res1.canonicalJson).toBe(res2.canonicalJson);
    expect(res1.orderFingerprint.length).toBe(64); // SHA256 hex length
  });

  it('alters orderFingerprint when any cart item or price changes', () => {
    const baseFingerprint = computeCartFingerprint(dummyCart, 'usr-shopper-001').orderFingerprint;

    // Mutate quantity
    const mutatedQtyCart: ICart = {
      ...dummyCart,
      items: [{ ...dummyCart.items[0], quantity: 2, itemTotal: 240 }],
      total: 259.2
    };
    const qtyFingerprint = computeCartFingerprint(mutatedQtyCart, 'usr-shopper-001').orderFingerprint;
    expect(qtyFingerprint).not.toBe(baseFingerprint);

    // Mutate version
    const mutatedVersionCart: ICart = {
      ...dummyCart,
      version: 2
    };
    const versionFingerprint = computeCartFingerprint(mutatedVersionCart, 'usr-shopper-001').orderFingerprint;
    expect(versionFingerprint).not.toBe(baseFingerprint);
  });

  it('verifyMandate validates untampered cart and rejects tampering or expiry', () => {
    const passport: IPurchasePassport = {
      passportId: 'psp-verify-01',
      version: 1,
      userId: 'usr-shopper-001',
      cartId: dummyCart.id,
      cartVersion: dummyCart.version,
      items: dummyCart.items,
      merchantInfo: [],
      priceBreakdown: {
        subtotal: dummyCart.subtotal,
        discount: dummyCart.discount,
        shipping: dummyCart.shipping,
        tax: dummyCart.tax,
        finalTotal: dummyCart.total,
        currency: 'USD'
      },
      budgetComparison: {
        userBudgetLimit: 1000,
        actualTotal: dummyCart.total,
        underBudgetBy: 870.4,
        budgetStatus: 'WITHIN_BUDGET'
      },
      agentActivityCount: 1,
      approvalStatus: 'pending_approval',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    store.passports.set(passport.passportId, passport);

    // 1. Issue approval mandate
    const approvalRes = approvePassportAndIssueMandate(passport, dummyCart, 'usr-shopper-001');
    expect(approvalRes.success).toBe(true);
    const mandate = approvalRes.mandate!;

    // 2. Verify with matching live cart -> Valid
    const verifyValid = verifyMandate(mandate.approvalId, dummyCart);
    expect(verifyValid.valid).toBe(true);

    // 3. Reject on Cart Version tampering
    const tamperedVersionCart: ICart = { ...dummyCart, version: 2 };
    const verifyTampered = verifyMandate(mandate.approvalId, tamperedVersionCart);
    expect(verifyTampered.valid).toBe(false);
    expect(verifyTampered.reason).toBe('CART_MODIFIED_AFTER_APPROVAL');

    // 4. Reject on Expiration
    mandate.expiresAt = new Date(Date.now() - 1000).toISOString();
    const verifyExpired = verifyMandate(mandate.approvalId, dummyCart);
    expect(verifyExpired.valid).toBe(false);
    expect(verifyExpired.reason).toBe('MANDATE_EXPIRED');

    // 5. Reject on Replay (Used mandate)
    mandate.expiresAt = new Date(Date.now() + 900000).toISOString();
    mandate.usedAt = new Date().toISOString();
    const verifyReplay = verifyMandate(mandate.approvalId, dummyCart);
    expect(verifyReplay.valid).toBe(false);
    expect(verifyReplay.reason).toBe('MANDATE_ALREADY_USED');
  });
});

