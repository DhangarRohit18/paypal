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

export const OrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSuccessRedirect = searchParams.get('success') === 'true';

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
      setResolutions(prev => [data.resolution, ...prev]);
      setResolutionReason('');
    } catch (err: any) {
      alert(`Resolution request failed: ${err.message}`);
    } finally {
      setSubmittingResolution(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-shopblue mx-auto" />
          <p className="text-sm text-slate-400">Loading Order History & Active Warranties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Success Banner if just ordered */}
        {isSuccessRedirect && (
          <div className="bg-emerald-950/80 border border-emerald-800 rounded-3xl p-6 mb-8 text-emerald-200 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base text-white">Payment Authorized & Order Dispatched</h3>
                <p className="text-xs text-emerald-300">
                  Your single-use approval mandate was verified and captured by PayPal Sandbox. An immutable Purchase Passport has been archived for warranty protection.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/workspace')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              Continue Shopping
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Orders & Post-Purchase Resolve</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Active Warranty Tracking, Return Protection Windows, and Resolve Agent
            </p>
          </div>
          <button
            onClick={() => navigate('/workspace')}
            className="px-4 py-2 rounded-xl bg-shopblue hover:bg-shopblue-600 text-white font-bold text-xs flex items-center space-x-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New Shopping Mission</span>
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-shopnavy border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Placed Orders Yet</h3>
            <p className="text-xs text-slate-400 mb-6">
              Complete your first purchase through the AI Shopping Workspace or Mission Bundle Optimizer.
            </p>
            <button
              onClick={() => navigate('/workspace')}
              className="py-3 px-6 rounded-xl bg-shopblue text-white font-bold text-xs"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Orders List (col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
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
                    className={`p-5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-shopblue shadow-lg'
                        : 'bg-shopnavy border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {order.orderId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-3 line-clamp-1">
                      {order.items.map(i => i.productSnapshot.title).join(', ')}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800/80">
                      <span className="text-slate-500">
                        {new Date(order.placedAt).toLocaleDateString()}
                      </span>
                      <span className="font-black text-white text-sm">
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
                <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                  {/* Order Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block mb-1">
                        Active Order Manifest
                      </span>
                      <h2 className="text-xl font-black text-white">{selectedOrder.orderId}</h2>
                    </div>

                    <div className="text-right text-xs font-mono">
                      <span className="text-slate-400 block">PayPal Capture ID</span>
                      <span className="text-emerald-400 font-bold">{selectedOrder.paypalCaptureId}</span>
                    </div>
                  </div>

                  {/* Dates & Protection Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-6">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-slate-500 block mb-1">Return Protection Deadline</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {selectedOrder.returnDeadlineDate}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                        Full 30-day merchant return protection active
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-slate-500 block mb-1">Hardware Warranty Coverage</span>
                      <span className="text-shopblue font-bold text-sm">
                        Until {selectedOrder.warrantyEndDate}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                        Manufacturer repair & replacement guarantee
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mb-8">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold block mb-3">
                      Ordered Products ({selectedOrder.items.length})
                    </span>
                    <div className="space-y-2.5">
                      {selectedOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{item.productSnapshot.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Sold by {item.productSnapshot.merchantName} • Qty {item.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-white">
                            ${item.itemTotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolve Agent Section */}
                  <div className="bg-gradient-to-r from-slate-900 to-shopnavy border border-shopviolet/40 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 text-shopviolet font-bold text-sm mb-2">
                      <RotateCcw className="w-4 h-4 text-shopviolet" />
                      <span>RESOLVE AGENT: Return & Warranty Guidance</span>
                    </div>

                    <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
                      Need to initiate a return, claim warranty coverage, or clarify merchant policy? The Resolve Agent checks verified policy manifests and generates an official submission request.
                    </p>

                    <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-mono">
                      {(['RETURN', 'WARRANTY_CLAIM', 'POLICY_INQUIRY'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setResolutionType(type)}
                          className={`py-2 px-3 rounded-xl border transition text-center font-bold text-[11px] ${
                            resolutionType === type
                              ? 'bg-shopviolet text-white border-shopviolet'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-shopviolet transition"
                      />
                    </div>

                    <button
                      onClick={() => handleCreateResolution(selectedOrder.orderId)}
                      disabled={submittingResolution || !resolutionReason.trim()}
                      className="w-full py-3 rounded-xl bg-shopviolet hover:bg-shopviolet-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow"
                    >
                      {submittingResolution ? (
                        <span>Processing with Resolve Agent...</span>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Generate Official Guidance Manifest</span>
                        </>
                      )}
                    </button>

                    {/* Active Resolution Output */}
                    {activeResolutionResult && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-mono">
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>RESOLUTION MANIFEST PREPARED ({activeResolutionResult.status})</span>
                        </div>
                        <p className="text-slate-300 font-sans text-xs leading-relaxed">
                          {activeResolutionResult.guidanceText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

