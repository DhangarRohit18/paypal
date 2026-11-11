import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  FileCheck2,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { api } from '../services/api.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    spendingGuard,
    secondOpinion,
    policySummary,
    updateQuantity,
    removeFromCart,
    clearCart,
    loading
  } = useCart();

  const handleGeneratePassport = async () => {
    try {
      const data = await api.generatePassport('Curated Workspace Order');
      if (data?.passport?.passportId) {
        navigate(`/passport?id=${data.passport.passportId}`);
      }
    } catch (err: any) {
      alert(`Could not generate passport: ${err.message}`);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-bg text-text flex items-center justify-center p-6 transition-colors">
        <Card className="max-w-md w-full p-8 text-center shadow-soft-xl">
          <div className="w-16 h-16 rounded-2xl bg-bg-subtle text-text-subtle flex items-center justify-center mx-auto mb-4 border border-border">
            <ShoppingBag className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2 tracking-tight">Your Cart is Empty</h2>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Explore our curated missions or ask SHOPMATE in the AI Workspace to assemble an optimal hardware setup.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/workspace')}
              variant="primary"
              size="md"
              className="w-full"
            >
              Go to AI Shopping Workspace
            </Button>
            <Button
              onClick={() => navigate('/missions')}
              variant="secondary"
              size="md"
              className="w-full"
            >
              Browse Bundle Missions
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-black text-text tracking-tight">Your Shopping Cart</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              Cart Version {cart.version} • Server-Authoritative Deterministic Pricing
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-text-muted hover:text-status-danger flex items-center space-x-1.5 font-mono px-3 py-1.5 rounded-lg border border-border hover:border-status-danger-border transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cart Items (col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="bg-surface border border-border rounded-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-border-strong transition shadow-soft-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bg-subtle text-text-muted font-bold border border-border">
                      {item.productSnapshot.category}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      Sold by {item.productSnapshot.merchantName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text mb-1">
                    {item.productSnapshot.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-text-muted font-mono">
                    <span>Warranty: {item.productSnapshot.warrantyMonths}m</span>
                    <span>•</span>
                    <span>Return window: {item.productSnapshot.returnPolicyDays}d</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6">
                  {/* Quantity adjustment */}
                  <div className="flex items-center space-x-2 bg-bg-subtle border border-border rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-surface hover:bg-bg border border-border flex items-center justify-center text-text transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-text tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-surface hover:bg-bg border border-border flex items-center justify-center text-text transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-text tabular-nums">
                      ${item.itemTotal.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-text-subtle font-mono tabular-nums">
                      ${item.unitPrice.toFixed(2)} each
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-text-subtle hover:text-status-danger transition p-1.5 rounded-lg hover:bg-status-danger-bg"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Second Opinion & Regret Shield */}
            {secondOpinion && (
              <div className="bg-surface border border-brand-violet/30 rounded-card-lg p-6 mt-8 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-5 h-5 text-brand-violet" />
                    <h3 className="font-bold text-base text-text">
                      Second Opinion & Regret Shield
                    </h3>
                  </div>
                  <Badge variant="brand" size="sm">
                    Confidence: {secondOpinion.confidenceScore}%
                  </Badge>
                </div>

                <p className="text-xs text-text-muted mb-4 leading-relaxed">
                  AEGIS evaluated your cart for potential buyer regret, paying for unneeded features, or missing cheaper sufficient alternatives.
                </p>

                {secondOpinion.cheaperSufficientAlternative && (
                  <div className="bg-bg-subtle border border-border rounded-xl p-4 mb-4">
                    <div className="flex items-center space-x-2 text-status-success text-xs font-mono font-bold mb-1.5">
                      <TrendingDown className="w-4 h-4" />
                      <span>Cheaper Alternative Available: Save ${secondOpinion.cheaperSufficientAlternative.priceSavings.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-text leading-relaxed mb-2">
                      {secondOpinion.cheaperSufficientAlternative.whySufficient}
                    </p>
                    <div className="text-[11px] font-mono text-text-muted">
                      Alternative: <strong className="text-text">{secondOpinion.cheaperSufficientAlternative.recommendedAlternative.title}</strong> (${secondOpinion.cheaperSufficientAlternative.recommendedAlternative.price})
                    </div>
                  </div>
                )}

                {secondOpinion.payingForUnneededFeatures && secondOpinion.payingForUnneededFeatures.length > 0 && (
                  <div className="bg-bg-subtle border border-status-warning-border rounded-xl p-4">
                    <span className="text-xs font-mono font-bold text-status-warning-text block mb-1">
                      Unneeded Headroom Flagged:
                    </span>
                    <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                      {secondOpinion.payingForUnneededFeatures.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Passport CTA (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Price Breakdown */}
            <Card className="p-6 shadow-soft-xl">
              <h3 className="font-bold text-lg text-text mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm pb-4 border-b border-border font-mono">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="text-text tabular-nums">${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Standard Shipping</span>
                  <span className="text-text">
                    {cart.shipping === 0 ? (
                      <span className="text-status-success font-semibold">FREE</span>
                    ) : (
                      `$${cart.shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Estimated Tax (8%)</span>
                  <span className="text-text tabular-nums">${cart.tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-4 pb-6">
                <span className="font-bold text-text text-base">Authoritative Total</span>
                <span className="text-2xl font-black font-mono text-status-success tabular-nums">
                  ${cart.total.toFixed(2)}
                </span>
              </div>

              {/* AEGIS Policy Checks */}
              {spendingGuard && (
                <div className="bg-bg-subtle rounded-xl p-3.5 border border-border mb-6 text-xs font-mono">
                  <div className="flex items-center space-x-1.5 text-status-success font-bold mb-1">
                    <ShieldCheck className="w-4 h-4 text-status-success" />
                    <span>AEGIS SPENDING GUARD: PASSED</span>
                  </div>
                  <span className="text-text-muted text-[11px] tabular-nums">
                    Remaining policy budget: ${policySummary?.remainingBudget.toFixed(2) || '0.00'}
                  </span>
                </div>
              )}

              {/* Generate Passport Button */}
              <button
                onClick={handleGeneratePassport}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-violet hover:opacity-95 text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-soft-md shadow-brand-blue/20"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Generate Purchase Passport</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <p className="text-[11px] text-text-subtle text-center mt-3 font-mono">
                Mandatory pre-checkout document. Locks prices and verifies hardware compatibility before PayPal checkout.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
