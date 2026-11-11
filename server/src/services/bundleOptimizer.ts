import { IBundlePlan, IProduct } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';
import { runFitCheck } from './fitCheck.js';

export interface OptimizeMissionParams {
  goal: string;
  targetBudget: number;
  categoriesNeeded?: string[];
  preferredBrands?: string[];
}

export function optimizeBundles(params: OptimizeMissionParams): IBundlePlan[] {
  const { targetBudget } = params;
  const availableProducts = store.products.filter(
    p => !p.isMaliciousSample && p.availability !== 'out_of_stock'
  );

  // Group products by category
  const laptops = availableProducts.filter(p => p.category === 'laptops');
  const monitors = availableProducts.filter(p => p.category === 'monitors');
  const headphones = availableProducts.filter(p => p.category === 'headphones');
  const keyboards = availableProducts.filter(p => p.category === 'keyboards');
  const mice = availableProducts.filter(p => p.category === 'mice');
  const accessories = availableProducts.filter(p => p.category === 'gaming_accessories' || p.category === 'smart_home');

  // Helper to score plan fit
  const createPlanItems = (prods: IProduct[]) => {
    const fitResults = runFitCheck(prods);
    return prods.map(product => {
      const fit = fitResults.find(f => f.targetId === product.id);
      return {
        product,
        quantity: 1,
        fitCheckScore: fit?.status === 'Compatible' ? 100 : 75,
        fitReason: fit?.reason || 'Verified standard compatibility.'
      };
    });
  };

  // Plan 1: Budget Optimized
  // Pick solid, highly-rated essentials with lowest cost
  const budgetLaptop = [...laptops].sort((a, b) => a.price - b.price)[0] || laptops[0];
  const budgetMonitor = [...monitors].sort((a, b) => a.price - b.price)[0] || monitors[0];
  const budgetKb = [...keyboards].sort((a, b) => a.price - b.price)[0] || keyboards[0];
  const budgetMouse = [...mice].sort((a, b) => a.price - b.price)[0] || mice[0];

  const budgetList = [budgetLaptop, budgetMonitor, budgetKb, budgetMouse].filter(Boolean);
  const budgetSubtotal = budgetList.reduce((acc, p) => acc + p.price, 0);
  const budgetTax = Math.round(budgetSubtotal * 0.08 * 100) / 100;
  const budgetTotal = Math.round((budgetSubtotal + budgetTax) * 100) / 100;

  const plan1: IBundlePlan = {
    planId: 'budget_optimized',
    name: 'Budget Optimized Package',
    tagline: 'Maximum utility & component durability while preserving maximum capital.',
    items: createPlanItems(budgetList),
    totalCost: budgetTotal,
    savingsVsBudget: Math.round(Math.max(0, targetBudget - budgetTotal) * 100) / 100,
    explanation: `Assembled using high-efficiency components: ${budgetLaptop?.title} paired with ${budgetMonitor?.title}. Includes silent ergonomic keyboard and ultra-light mouse.`,
    tradeOffSummary: 'Sacrifices dedicated high-wattage GPU and OLED display for substantial cost reduction.'
  };

  // Plan 2: Best Overall Value (Sweet Spot)
  const valLaptop = laptops.find(l => l.price > 700 && l.price < 1100) || budgetLaptop;
  const valMonitor = monitors.find(m => m.specs?.resolution?.toString().includes('4K')) || monitors[0];
  const valKb = keyboards.find(k => k.price >= 80) || keyboards[0];
  const valMouse = mice.find(m => m.brand === 'Logitech') || mice[0];
  const valAcc = accessories[0];

  const valList = [valLaptop, valMonitor, valKb, valMouse, valAcc].filter(Boolean);
  const valSubtotal = valList.reduce((acc, p) => acc + p.price, 0);
  const valTax = Math.round(valSubtotal * 0.08 * 100) / 100;
  const valTotal = Math.round((valSubtotal + valTax) * 100) / 100;

  const plan2: IBundlePlan = {
    planId: 'best_value',
    name: 'Best Overall Value (Architect Recommended)',
    tagline: 'The ideal balance of compute power, high-fidelity 4K display, and workflow ergonomics.',
    items: createPlanItems(valList),
    totalCost: valTotal,
    savingsVsBudget: Math.round(Math.max(0, targetBudget - valTotal) * 100) / 100,
    explanation: `Features ${valLaptop?.title} with dedicated hardware acceleration, connected via 90W USB-C single cable to ${valMonitor?.title}. Includes mechanical keyboard and multi-device mouse.`,
    tradeOffSummary: 'Balanced investment; satisfies 95% of developer and creative workloads without overpaying for enterprise headroom.'
  };

  // Plan 3: Premium Performance
  const premLaptop = [...laptops].sort((a, b) => b.price - a.price)[0] || laptops[0];
  const premMonitor = [...monitors].sort((a, b) => b.price - a.price)[0] || monitors[0];
  const premAudio = headphones[0];
  const premKb = keyboards[0];
  const premMouse = mice[0];

  const premList = [premLaptop, premMonitor, premAudio, premKb, premMouse].filter(Boolean);
  const premSubtotal = premList.reduce((acc, p) => acc + p.price, 0);
  const premTax = Math.round(premSubtotal * 0.08 * 100) / 100;
  const premTotal = Math.round((premSubtotal + premTax) * 100) / 100;

  const plan3: IBundlePlan = {
    planId: 'premium_performance',
    name: 'Peak Performance Enthusiast Station',
    tagline: 'Top-tier compute silicon, high-refresh display, and studio-grade noise-cancelling audio.',
    items: createPlanItems(premList),
    totalCost: premTotal,
    savingsVsBudget: Math.round(Math.max(0, targetBudget - premTotal) * 100) / 100,
    explanation: `Equipped with ${premLaptop?.title} (24-core compute engine, RTX 4070) plus ${premAudio?.title} for distraction-free deep work.`,
    tradeOffSummary: 'Utilizes higher budget envelope for uncompromising computational and graphic throughput.'
  };

  return [plan1, plan2, plan3];
}

