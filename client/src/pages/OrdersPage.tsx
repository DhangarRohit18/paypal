import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Package,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Wrench,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { api } from '../services/api.js';
import { IOrder, IResolutionRequest } from '../../../shared/types.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

export const OrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSuccessRedirect = searchParams.get('status') === 'success' || searchParams.get('success') === 'true';

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [resolutions, setResolutions] = useState<IResolutionRequest[]>([]);
  const [resolutionType, setResolutionType] = useState<'RETURN' | 'WARRANTY_CLAIM' | 'POLICY_INQUIRY'>('RETURN');
  const [resolutionReason, setResolutionReason] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [activeResolutionResult, setActiveResolutionResult] = useState<IResolutionRequest | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data.orders);
      if (data.orders.length > 0) {
        setSelectedOrder(data.orders[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResolution = async (orderId: string) => {
    if (!resolutionReason.trim()) {
      alert('Please provide a reason or note for the resolution request.');
      return;
    }
    try {
      setSubmittingResolution(true);
      const data = await api.createResolutionRequest(orderId, resolutionType, resolutionReason);
      setActiveResolutionResult(data.resolution);
      setResolutions((prev) => [data.resolution, ...prev]);
      setResolutionReason('');
    } catch (err: any) {
      alert(`Resolution request failed: ${err.message}`);
    } finally {
      setSubmittingResolution(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
          <p className="text-sm text-text-muted">Loading Order History & Active Warranties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Success Banner if just redirected from PayPal */}
        {isSuccessRedirect && (
          <div className="bg-status-success-bg border border-status-success-border rounded-card-lg p-6 text-status-success flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-status-success flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base text-text">Payment Authorized & Order Dispatched</h3>
                <p className="text-xs text-text-muted">
                  Your single-use approval mandate was verified and captured by PayPal Sandbox. An immutable Purchase Passport has been archived for warranty protection.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/workspace')}
              variant="primary"
              size="sm"
            >
              Continue Shopping
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-black text-text tracking-tight">Orders & Post-Purchase Resolve</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              Active Warranty Tracking, Return Protection Windows, and Resolve Agent
            </p>
          </div>
          <Button
            onClick={() => navigate('/workspace')}
            variant="primary"
            size="md"
            className="flex items-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New Shopping Mission</span>
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card className="max-w-md mx-auto p-12 text-center shadow-soft-xl">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text mb-2">No Placed Orders Yet</h3>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              Complete your first purchase through the AI Shopping Workspace or Mission Bundle Optimizer.
            </p>
            <Button
              onClick={() => navigate('/workspace')}
              variant="primary"
              size="md"
              className="w-full"
            >
              Start Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Orders List (col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider block mb-2">
                Order History ({orders.length})
              </span>

              {orders.map((order) => {
                const isSelected = selectedOrder?.orderId === order.orderId;
                return (
                  <div
                    key={order.orderId}
                    onClick={() => {
                      setSelectedOrder(order);
                      setActiveResolutionResult(null);
                    }}
                    className={`p-5 rounded-card border transition cursor-pointer ${
                      isSelected
                        ? 'bg-surface border-brand-blue shadow-soft-md'
                        : 'bg-surface border-border hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-text text-sm">
                        {order.orderId}
                      </span>
                      <Badge variant="blue" size="sm">
                        {order.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-text-muted mb-3 line-clamp-1">
                      {order.items.map((i) => i.productSnapshot.title).join(', ')}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-border">
                      <span className="text-text-subtle">
                        {new Date(order.placedAt).toLocaleDateString()}
                      </span>
                      <span className="font-black text-text text-sm">
                        ${order.totalAmount.toFixed(2)} {order.currency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Selected Order Inspector & Resolve Agent (col-span-7) */}
            {selectedOrder && (
              <div className="lg:col-span-7 space-y-6">
                <Card className="p-6 sm:p-8 shadow-soft-lg">
                  {/* Order Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                        Active Order Manifest
                      </span>
                      <h2 className="text-xl font-black text-text">{selectedOrder.orderId}</h2>
                    </div>

                    <div className="text-right text-xs font-mono">
                      <span className="text-text-muted block">PayPal Capture ID</span>
                      <span className="text-status-success font-bold">{selectedOrder.paypalCaptureId}</span>
                    </div>
                  </div>

                  {/* Dates & Protection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono mb-6">
                    <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                      <span className="text-text-muted block mb-1">Return Protection Deadline</span>
                      <span className="text-status-success font-bold text-sm">
                        {selectedOrder.returnDeadlineDate}
                      </span>
                      <span className="text-[10px] text-text-muted block mt-1 font-sans">
                        Full 30-day merchant return protection active
                      </span>
                    </div>

                    <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                      <span className="text-text-muted block mb-1">Hardware Warranty Coverage</span>
                      <span className="text-brand-blue font-bold text-sm">
                        Until {selectedOrder.warrantyEndDate}
                      </span>
                      <span className="text-[10px] text-text-muted block mt-1 font-sans">
                        Manufacturer repair & replacement guarantee
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mb-8">
                    <span className="text-xs uppercase font-mono tracking-wider text-text-muted font-bold block mb-3">
                      Ordered Products ({selectedOrder.items.length})
                    </span>
                    <div className="space-y-2.5">
                      {selectedOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-bg-subtle p-3.5 rounded-xl border border-border flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-text block">{item.productSnapshot.title}</span>
                            <span className="text-[10px] text-text-muted font-mono">
                              Sold by {item.productSnapshot.merchantName} • Qty {item.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-text">
                            ${item.itemTotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolve Agent Section */}
                  <div className="bg-bg-subtle border border-brand-violet/30 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 text-brand-violet font-bold text-sm mb-2">
                      <RotateCcw className="w-4 h-4 text-brand-violet" />
                      <span>RESOLVE AGENT: Return & Warranty Guidance</span>
                    </div>

                    <p className="text-xs text-text-muted mb-4 leading-relaxed font-sans">
                      Need to initiate a return, claim warranty coverage, or clarify merchant policy? The Resolve Agent checks verified policy manifests and generates an official submission request.
                    </p>

                    <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-mono">
                      {(['RETURN', 'WARRANTY_CLAIM', 'POLICY_INQUIRY'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setResolutionType(type)}
                          className={`py-2 px-3 rounded-xl border transition text-center font-bold text-[11px] ${
                            resolutionType === type
                              ? 'bg-brand-violet text-white border-brand-violet'
                              : 'bg-surface text-text-muted border-border hover:text-text'
                          }`}
                        >
                          {type === 'RETURN' ? 'Return RMA' : type === 'WARRANTY_CLAIM' ? 'Warranty Claim' : 'Policy Inquiry'}
                        </button>
                      ))}
                    </div>

                    <div className="mb-4">
                      <input
                        type="text"
                        value={resolutionReason}
                        onChange={(e) => setResolutionReason(e.target.value)}
                        placeholder="Reason or details (e.g. Device does not fit my desk, need RMA label)..."
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text placeholder-text-subtle focus:outline-none focus:border-brand-violet transition"
                      />
                    </div>

                    <Button
                      onClick={() => handleCreateResolution(selectedOrder.orderId)}
                      disabled={submittingResolution || !resolutionReason.trim()}
                      variant="primary"
                      size="md"
                      className="w-full bg-brand-violet hover:bg-brand-violet/90 flex items-center justify-center space-x-2"
                    >
                      {submittingResolution ? (
                        <span>Processing with Resolve Agent...</span>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Generate Official Guidance Manifest</span>
                        </>
                      )}
                    </Button>

                    {/* Active Resolution Output */}
                    {activeResolutionResult && (
                      <div className="mt-4 p-4 rounded-xl bg-surface border border-status-success-border text-xs font-mono">
                        <div className="flex items-center space-x-2 text-status-success font-bold mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>RESOLUTION MANIFEST PREPARED ({activeResolutionResult.status})</span>
                        </div>
                        <p className="text-text-muted font-sans text-xs leading-relaxed">
                          {activeResolutionResult.guidanceText}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
