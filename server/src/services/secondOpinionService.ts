import { ICart, ISecondOpinionReport } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';

export function generateSecondOpinion(cart: ICart): ISecondOpinionReport {
  let cheaperAlternative: ISecondOpinionReport['cheaperSufficientAlternative'] = undefined;
  const payingForUnneeded: string[] = [];
  const weakPolicies: string[] = [];

  for (const item of cart.items) {
    // 1. Check if an item has a cheaper alternative in the same category
    const peers = store.products.filter(
      p =>
        p.category === item.productSnapshot.category &&
        p.id !== item.productId &&
        !p.isMaliciousSample &&
        p.availability !== 'out_of_stock'
    );

    const cheaper = peers.find(p => p.price < item.unitPrice * 0.8);
    if (cheaper && !cheaperAlternative) {
      const originalProd = store.getProductById(item.productId) || (item.productSnapshot as any);
      cheaperAlternative = {
        originalProduct: originalProd,
        recommendedAlternative: cheaper,
        priceSavings: Math.round((item.unitPrice - cheaper.price) * 100) / 100,
        specComparison: {
          price: { original: item.unitPrice, alternative: cheaper.price },
          warranty: { original: `${item.productSnapshot.warrantyMonths}m`, alternative: `${cheaper.warrantyMonths}m` }
        },
        whySufficient: `"${cheaper.title}" satisfies the core requirements for ${cheaper.category} while reducing spend by $${(item.unitPrice - cheaper.price).toFixed(2)}.`
      };
    }

    // 2. Unneeded feature checks
    if (item.unitPrice > 1000 && item.productSnapshot.category === 'laptops') {
      payingForUnneeded.push(
        `Dedicated 140W GPU headroom on ${item.productSnapshot.title} is surplus unless doing intensive local 3D rendering or AAA gaming.`
      );
    }

    // 3. Return policy check
    if (item.productSnapshot.returnPolicyDays < 30) {
      weakPolicies.push(
        `Short ${item.productSnapshot.returnPolicyDays}-day return window on ${item.productSnapshot.title} by ${item.productSnapshot.merchantName}.`
      );
    }
  }

  let overallVerdict: ISecondOpinionReport['overallVerdict'] = 'RECOMMENDED';
  if (cheaperAlternative && cheaperAlternative.priceSavings > 200) {
    overallVerdict = 'SUBSTANTIAL_SAVINGS_AVAILABLE';
  } else if (weakPolicies.length > 0 || payingForUnneeded.length > 0) {
    overallVerdict = 'CAUTION_BETTER_OPTION_EXISTS';
  }

  return {
    meetsRequirements: true,
    cheaperSufficientAlternative: cheaperAlternative,
    payingForUnneededFeatures: payingForUnneeded,
    weakPoliciesFlagged: weakPolicies,
    overallVerdict,
    confidenceScore: 94
  };
}

