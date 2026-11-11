import { ICart, ISpendingPolicy } from '../../../shared/types.js';

export interface SpendingGuardValidationResult {
  allowed: boolean;
  violations: string[];
  suggestedFixes: string[];
}

export class SpendingGuardService {
  /**
   * Pure deterministic validator: checks a cart against user spending policy.
   * Returns violations and actionable plain-language suggested fixes.
   */
  validate(cart: ICart, policy: ISpendingPolicy): SpendingGuardValidationResult {
    const violations: string[] = [];
    const suggestedFixes: string[] = [];

    // 1. Kill Switch Check
    if (policy.killSwitchActive) {
      violations.push('EMERGENCY KILL SWITCH ENGAGED. All purchasing operations are halted.');
      suggestedFixes.push('Deactivate the AEGIS emergency kill switch in Settings to resume purchasing.');
      return { allowed: false, violations, suggestedFixes };
    }

    const effectiveBudget = Math.min(policy.maxCartValue || Infinity, policy.totalBudget || Infinity);

    // 2. Max Cart Value / Total Budget Check
    if (cart.total > effectiveBudget) {
      const overage = Math.round((cart.total - effectiveBudget) * 100) / 100;
      violations.push(
        `Cart total ($${cart.total.toFixed(2)}) exceeds allowable spending limit ($${effectiveBudget.toFixed(2)}) by $${overage.toFixed(2)}`
      );

      // Find best single item to remove or reduce to resolve overage
      const candidateToRemove = cart.items.find((item) => item.itemTotal >= overage);
      if (candidateToRemove) {
        suggestedFixes.push(
          `Cart would be $${cart.total.toFixed(2)}, limit is $${effectiveBudget.toFixed(2)}. Remove "${candidateToRemove.productSnapshot.title}" to save $${candidateToRemove.itemTotal.toFixed(2)} and stay under limit.`
        );
      } else if (cart.items.length > 0) {
        const highestPriced = [...cart.items].sort((a, b) => b.itemTotal - a.itemTotal)[0];
        suggestedFixes.push(
          `Reduce quantity or remove "${highestPriced.productSnapshot.title}" to save up to $${highestPriced.itemTotal.toFixed(2)}.`
        );
      }
    }

    // 3. Per-Item Rules (Price, Quantity, Restricted Categories, Allowed Categories, Approved Merchants)
    for (const item of cart.items) {
      // Max price per item
      if (item.unitPrice > policy.maxPricePerItem) {
        violations.push(
          `Item "${item.productSnapshot.title}" unit price ($${item.unitPrice.toFixed(2)}) exceeds maximum per-item limit ($${policy.maxPricePerItem.toFixed(2)})`
        );
        suggestedFixes.push(
          `Swap "${item.productSnapshot.title}" for a compatible model priced under $${policy.maxPricePerItem.toFixed(2)}.`
        );
      }

      // Max quantity per item
      if (item.quantity > policy.maxQuantityPerItem) {
        violations.push(
          `Quantity (${item.quantity}) for "${item.productSnapshot.title}" exceeds maximum per-item limit (${policy.maxQuantityPerItem})`
        );
        suggestedFixes.push(
          `Reduce quantity of "${item.productSnapshot.title}" from ${item.quantity} to ${policy.maxQuantityPerItem}.`
        );
      }

      // Restricted categories
      if (
        policy.restrictedCategories &&
        policy.restrictedCategories.length > 0 &&
        policy.restrictedCategories.includes(item.productSnapshot.category)
      ) {
        violations.push(
          `Category "${item.productSnapshot.category}" is strictly restricted under your active spending policy`
        );
        suggestedFixes.push(
          `Remove "${item.productSnapshot.title}" or remove "${item.productSnapshot.category}" from restricted categories in AEGIS Settings.`
        );
      }

      // Allowed categories (whitelist)
      if (
        policy.allowedCategories &&
        policy.allowedCategories.length > 0 &&
        !policy.allowedCategories.includes(item.productSnapshot.category)
      ) {
        violations.push(
          `Category "${item.productSnapshot.category}" is not in your allowed categories list`
        );
        suggestedFixes.push(
          `Add "${item.productSnapshot.category}" to allowed categories in AEGIS Settings.`
        );
      }

      // Approved merchants (whitelist)
      if (
        policy.approvedMerchants &&
        policy.approvedMerchants.length > 0 &&
        !policy.approvedMerchants.includes(item.productSnapshot.merchantId)
      ) {
        violations.push(
          `Merchant "${item.productSnapshot.merchantName || item.productSnapshot.merchantId}" is not on your pre-approved merchant list`
        );
        suggestedFixes.push(
          `Add merchant "${item.productSnapshot.merchantName}" to approved merchants in AEGIS Settings, or select an approved merchant.`
        );
      }
    }

    const allowed = violations.length === 0;
    return {
      allowed,
      violations,
      suggestedFixes
    };
  }
}

export const spendingGuard = new SpendingGuardService();

// Backwards compatibility alias
export function checkCartAgainstPolicy(cart: ICart, policy: ISpendingPolicy) {
  const result = spendingGuard.validate(cart, policy);
  return {
    allowed: result.allowed,
    reasons: result.violations,
    recommendedAction: result.suggestedFixes.join(' ') || 'Policy checks passed successfully.'
  };
}

export function checkSinglePurchase(amount: number, category: string, policy: ISpendingPolicy) {
  const dummyCart: ICart = {
    id: 'single-check',
    userId: policy.userId,
    version: 1,
    items: [
      {
        productId: 'single-check-item',
        productSnapshot: {
          id: 'single-check-item',
          title: 'Single Item Evaluation',
          price: amount,
          category,
          brand: 'Any',
          merchantId: 'any',
          merchantName: 'Any Merchant',
          specs: {},
          warrantyMonths: 12,
          returnPolicyDays: 30
        },
        quantity: 1,
        unitPrice: amount,
        itemTotal: amount
      }
    ],
    subtotal: amount,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: amount,
    currency: 'USD',
    updatedAt: new Date().toISOString()
  };

  const result = spendingGuard.validate(dummyCart, policy);
  return {
    allowed: result.allowed,
    reasons: result.violations,
    recommendedAction: result.suggestedFixes.join(' ') || 'Approved for purchase.'
  };
}
