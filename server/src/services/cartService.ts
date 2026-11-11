import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { ICart, ICartItem, ISecurityEvent, IAgentEvent } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';
import { spendingGuard } from './spendingGuard.js';
import { CartModel } from '../models/Cart.js';
import { PurchasePassportModel } from '../models/PurchasePassport.js';
import { ApprovalModel } from '../models/Approval.js';

/**
 * Computes subtotal, shipping, tax, and total using strict integer cents to prevent floating point inaccuracies.
 */
export function computeCartTotals(items: ICartItem[]): Pick<ICart, 'subtotal' | 'discount' | 'shipping' | 'tax' | 'total'> {
  const subtotalCents = items.reduce((sum, item) => {
    const itemUnitCents = Math.round(item.unitPrice * 100);
    return sum + itemUnitCents * item.quantity;
  }, 0);

  const discountCents = 0;
  // Free shipping over $100 (10,000 cents), or if cart is empty
  const shippingCents = subtotalCents >= 10000 || items.length === 0 ? 0 : 999;
  // Standard 8% tax computed in integer cents
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents - discountCents + shippingCents + taxCents;

  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    shipping: shippingCents / 100,
    tax: taxCents / 100,
    total: totalCents / 100
  };
}

export function getOrCreateCart(userId: string): ICart {
  let cart = store.getCartByUserId(userId);
  if (!cart) {
    cart = {
      id: `cart-${uuidv4()}`,
      userId,
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
    store.carts.set(userId, cart);
  }
  return cart;
}

/**
 * Automatically invalidates all existing active passports and signed approval mandates
 * when cart contents or quantities are modified.
 */
export function invalidateCartPassportsAndApprovals(userId: string, cartId: string, oldVersion: number, newVersion: number): void {
  const invalidationReason = `Cart contents modified after passport generation (cart version incremented from ${oldVersion} to ${newVersion}).`;

  // 1. Invalidate In-Memory Passports
  for (const passport of store.passports.values()) {
    if (passport.userId === userId && (passport.cartId === cartId || !passport.cartId)) {
      if (['draft', 'pending_approval', 'approved', 'DRAFT', 'CO_APPROVAL_PENDING', 'APPROVED'].includes(passport.approvalStatus)) {
        passport.approvalStatus = 'invalidated';
        passport.invalidationReason = invalidationReason;
      }
    }
  }

  // 2. Invalidate In-Memory Approvals
  for (const approval of store.approvals.values()) {
    if (approval.userId === userId && approval.cartVersion < newVersion) {
      if ((approval as any).status !== 'used') {
        (approval as any).status = 'invalidated';
      }
    }
  }

  // 3. Sync MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    PurchasePassportModel.updateMany(
      {
        userId,
        approvalStatus: { $in: ['draft', 'pending_approval', 'approved', 'DRAFT', 'CO_APPROVAL_PENDING', 'APPROVED'] }
      },
      {
        $set: {
          approvalStatus: 'invalidated',
          invalidationReason
        }
      }
    ).catch((err) => console.warn('MongoDB passport invalidation sync error:', err));

    ApprovalModel.updateMany(
      {
        userId,
        status: 'approved',
        cartVersion: { $lt: newVersion }
      },
      {
        $set: { status: 'invalidated' }
      }
    ).catch((err) => console.warn('MongoDB approval invalidation sync error:', err));
  }
}

export function addToCart(
  userId: string,
  productId: string,
  quantity = 1
): { cart?: ICart; error?: string; reasons?: string[]; violations?: string[]; suggestedFixes?: string[] } {
  const policy = store.getSpendingPolicy(userId);
  if (policy.killSwitchActive) {
    return {
      error: 'KILL_SWITCH_ACTIVE',
      reasons: ['Emergency kill switch is engaged.'],
      violations: ['Emergency kill switch is engaged.'],
      suggestedFixes: ['Deactivate the AEGIS kill switch in Settings to resume.']
    };
  }

  if (quantity <= 0) {
    return {
      error: 'INVALID_QUANTITY',
      reasons: ['Quantity must be a positive integer.'],
      violations: ['Quantity must be at least 1.']
    };
  }

  const product = store.getProductById(productId);
  if (!product) {
    return { error: 'PRODUCT_NOT_FOUND', reasons: ['Product not found in catalogue.'] };
  }

  if (product.isMaliciousSample) {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'PROMPT_INJECTION_DETECTED',
      source: 'cart_tamper',
      severity: 'HIGH',
      payloadExcerpt: `Attempted to add red-team malicious sample ${productId} to cart`,
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_TOOL_GATEWAY',
      remedySuggested: 'Untrusted red team payload quarantined. Cannot be purchased.'
    };
    store.addSecurityEvent(secEvent);
    return {
      error: 'SECURITY_VIOLATION',
      reasons: ['AEGIS Security: Cannot add adversarial Red Team sample asset to live cart.']
    };
  }

  if (product.availability === 'out_of_stock' || product.inventoryCount <= 0) {
    return {
      error: 'OUT_OF_STOCK',
      reasons: [`"${product.title}" is currently out of stock.`]
    };
  }

  const cart = getOrCreateCart(userId);
  const existingIndex = cart.items.findIndex((i) => i.productId === productId);

  const newItems = [...cart.items];
  const unitPriceCents = Math.round(product.price * 100);

  if (existingIndex >= 0) {
    const existing = newItems[existingIndex];
    const newQty = existing.quantity + quantity;

    if (product.inventoryCount && newQty > product.inventoryCount) {
      return {
        error: 'INSUFFICIENT_STOCK',
        reasons: [`Requested quantity (${newQty}) exceeds available inventory (${product.inventoryCount}).`]
      };
    }

    newItems[existingIndex] = {
      ...existing,
      quantity: newQty,
      itemTotal: (unitPriceCents * newQty) / 100
    };
  } else {
    if (product.inventoryCount && quantity > product.inventoryCount) {
      return {
        error: 'INSUFFICIENT_STOCK',
        reasons: [`Requested quantity (${quantity}) exceeds available inventory (${product.inventoryCount}).`]
      };
    }

    newItems.push({
      productId: product.id,
      productSnapshot: {
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category,
        brand: product.brand,
        merchantId: product.merchantId,
        merchantName: product.merchantName || 'Verified Merchant',
        specs: product.specs || {},
        warrantyMonths: product.warrantyMonths || 12,
        returnPolicyDays: product.returnPolicyDays || 30
      },
      quantity,
      unitPrice: product.price, // Server-authoritative DB price
      itemTotal: (unitPriceCents * quantity) / 100
    });
  }

  const totals = computeCartTotals(newItems);
  const prospectiveCart: ICart = {
    ...cart,
    version: cart.version + 1,
    items: newItems,
    ...totals,
    updatedAt: new Date().toISOString()
  };

  // Run Spending Guard pure validator
  const guard = spendingGuard.validate(prospectiveCart, policy);
  if (!guard.allowed) {
    // Log SecurityEvent and AgentEvent for spending limit breach
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'BUDGET_LIMIT_BREACH',
      source: 'cart_tamper',
      severity: 'MEDIUM',
      payloadExcerpt: guard.violations.join('; '),
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_TOOL_GATEWAY',
      remedySuggested: guard.suggestedFixes.join(' ')
    };
    store.addSecurityEvent(secEvent);

    const agtEvent: IAgentEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      agentId: 'aegis',
      action: 'SPENDING_GUARD_CART_BLOCKED',
      toolName: 'addToCart',
      inputSummary: `Add ${product.title} (Qty: ${quantity})`,
      outputSummary: guard.violations[0],
      permissionCheck: 'DENIED',
      riskLevel: 'MEDIUM'
    };
    store.addAgentEvent(agtEvent);

    return {
      error: 'SPENDING_POLICY_VIOLATION',
      reasons: guard.violations,
      violations: guard.violations,
      suggestedFixes: guard.suggestedFixes
    };
  }

  // Cart changed: Invalidate prior passports & approvals
  invalidateCartPassportsAndApprovals(userId, cart.id, cart.version, prospectiveCart.version);

  store.carts.set(userId, prospectiveCart);

  // Sync MongoDB
  if (mongoose.connection.readyState === 1) {
    CartModel.updateOne(
      { cartId: prospectiveCart.id },
      { $set: prospectiveCart },
      { upsert: true }
    ).catch((err) => console.warn('MongoDB cart sync error:', err));
  }

  return { cart: prospectiveCart };
}

export function updateCartQuantity(
  userId: string,
  productId: string,
  quantity: number
): { cart?: ICart; error?: string; reasons?: string[]; violations?: string[]; suggestedFixes?: string[] } {
  const policy = store.getSpendingPolicy(userId);
  if (policy.killSwitchActive) {
    return { error: 'KILL_SWITCH_ACTIVE', reasons: ['Kill switch active.'] };
  }

  const cart = getOrCreateCart(userId);
  if (quantity <= 0) {
    return removeFromCart(userId, productId);
  }

  const existingIndex = cart.items.findIndex((i) => i.productId === productId);
  if (existingIndex < 0) {
    return { error: 'ITEM_NOT_IN_CART', reasons: ['Item is not in your cart.'] };
  }

  const newItems = [...cart.items];
  const item = newItems[existingIndex];
  const unitPriceCents = Math.round(item.unitPrice * 100);

  newItems[existingIndex] = {
    ...item,
    quantity,
    itemTotal: (unitPriceCents * quantity) / 100
  };

  const totals = computeCartTotals(newItems);
  const prospectiveCart: ICart = {
    ...cart,
    version: cart.version + 1,
    items: newItems,
    ...totals,
    updatedAt: new Date().toISOString()
  };

  const guard = spendingGuard.validate(prospectiveCart, policy);
  if (!guard.allowed) {
    const secEvent: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'BUDGET_LIMIT_BREACH',
      source: 'cart_tamper',
      severity: 'MEDIUM',
      payloadExcerpt: guard.violations.join('; '),
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_TOOL_GATEWAY',
      remedySuggested: guard.suggestedFixes.join(' ')
    };
    store.addSecurityEvent(secEvent);

    return {
      error: 'SPENDING_POLICY_VIOLATION',
      reasons: guard.violations,
      violations: guard.violations,
      suggestedFixes: guard.suggestedFixes
    };
  }

  invalidateCartPassportsAndApprovals(userId, cart.id, cart.version, prospectiveCart.version);

  store.carts.set(userId, prospectiveCart);
  return { cart: prospectiveCart };
}

export function removeFromCart(userId: string, productId: string): { cart: ICart } {
  const cart = getOrCreateCart(userId);
  const newItems = cart.items.filter((i) => i.productId !== productId);
  const totals = computeCartTotals(newItems);

  const updatedCart: ICart = {
    ...cart,
    version: cart.version + 1,
    items: newItems,
    ...totals,
    updatedAt: new Date().toISOString()
  };

  invalidateCartPassportsAndApprovals(userId, cart.id, cart.version, updatedCart.version);

  store.carts.set(userId, updatedCart);
  return { cart: updatedCart };
}

export function clearCart(userId: string): ICart {
  const cart = getOrCreateCart(userId);
  const emptyCart: ICart = {
    ...cart,
    version: cart.version + 1,
    items: [],
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    updatedAt: new Date().toISOString()
  };

  invalidateCartPassportsAndApprovals(userId, cart.id, cart.version, emptyCart.version);

  store.carts.set(userId, emptyCart);
  return emptyCart;
}
