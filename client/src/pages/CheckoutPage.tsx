import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.js';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const passportId = searchParams.get('passportId');
  const approvalId = searchParams.get('approvalId');

  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const [orderPayload, setOrderPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!passportId || !approvalId) {
      setError('Missing passportId or approvalId parameters.');
      setLoading(false);
      return;
    }
    initializeCheckout();
  }, [passportId, approvalId]);

  const initializeCheckout = async () => {
    try {
      setLoading(true);
      const config = await api.getPayPalConfig();
      setPaypalConfig(config);

      const orderData = await api.createPayPalOrder(passportId!, approvalId!);
      setOrderPayload(orderData);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize PayPal order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureOrder = async () => {
    if (!orderPayload) return;
    try {
      setCapturing(true);
      const result = await api.capturePayPalOrder(orderPayload.paypalOrderId, approvalId!);
      await refreshCart();
      navigate(`/orders?success=true&orderId=${result.order.orderId}`);
    } catch (err: any) {
      alert(`Capture failed: ${err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-shopblue mx-auto" />
          <p className="text-sm text-slate-400">Verifying Mandate Fingerprint with PayPal Orders v2...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-shopnavy border border-rose-800 rounded-3xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Checkout Security Intercept</h2>
          <p className="text-xs text-rose-300 font-mono mb-6">{error}</p>
          <button
            onClick={() => navigate('/cart')}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold text-sm"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Card */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-8 shadow-2xl">
          {/* Top Logo */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tight text-white">
                SHOPMATE<span className="text-shopblue">.AI</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">PAYPAL CHECKOUT</span>
            </div>

            <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-xs font-bold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AEGIS FINGERPRINT VERIFIED</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-center mb-6">
            <span className="text-xs font-mono text-slate-400 block mb-1">
              Authorized Payment Amount
            </span>
            <div className="text-4xl font-black font-mono text-white mb-2">
              ${orderPayload?.finalAmount || '0.00'} <span className="text-sm font-bold text-slate-500">USD</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              PayPal Order ID: {orderPayload?.paypalOrderId}
            </span>
          </div>

          {/* Environment Status Notice */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 mb-8 text-xs font-mono text-blue-200">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>PAYPAL SANDBOX ENVIRONMENT</span>
            </div>
            <p className="text-[11px] text-blue-300 leading-relaxed font-sans">
              {paypalConfig?.configured
                ? 'Connected to live PayPal Sandbox Orders v2 REST API. Real sandbox credentials loaded.'
                : 'Offline rule-based sandbox simulation. Real PayPal Orders v2 schema verified. To connect live PayPal Sandbox, add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to server/.env.'}
            </p>
          </div>

          {/* Checkout Buttons */}
          <div className="space-y-4">
            {orderPayload?.approveUrl && paypalConfig?.configured ? (
              <a
                href={orderPayload.approveUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 rounded-2xl bg-[#0070BA] hover:bg-[#003087] text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <span>Authorize with PayPal Sandbox</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}

            {/* Direct Sandbox Capture Trigger */}
            <button
              onClick={handleCaptureOrder}
              disabled={capturing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-shopblue to-emerald-500 hover:from-shopblue-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-xl"
            >
              {capturing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Capturing Payment & Generating Order...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Execute Authorized Sandbox Payment</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          {/* Bottom Security Note */}
          <p className="text-[11px] text-slate-500 text-center font-mono mt-6">
            Single-use HMAC-SHA256 mandate will be marked as used upon capture to permanently prevent replay attacks.
          </p>
        </div>
      </div>
    </div>
  );
};

