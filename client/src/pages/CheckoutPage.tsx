import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  FileCheck2,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';

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
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    if (!passportId || !approvalId) {
      setError({
        code: 'MISSING_PARAMETERS',
        message: 'Both passportId and approvalId are required to initiate checkout.'
      });
      setLoading(false);
      return;
    }
    initializeCheckout();
  }, [passportId, approvalId]);

  const initializeCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check PayPal configuration first
      const config = await api.getPayPalConfig();
      setPaypalConfig(config);

      if (!config.configured) {
        setError({
          code: 'PAYPAL_NOT_CONFIGURED',
          message:
            'PayPal Sandbox credentials are not configured on this server. In accordance with AEGIS Phase 5 security specifications, automated orders cannot be simulated as completed without genuine sandbox credentials.'
        });
        setLoading(false);
        return;
      }

      // Create official PayPal Orders v2 Order
      const orderData = await api.createPayPalOrder(passportId!, approvalId!);
      setOrderPayload(orderData);
    } catch (err: any) {
      const errCode = err.code || err.error || 'ORDER_CREATION_FAILED';
      setError({
        code: errCode,
        message: err.message || 'Failed to initialize PayPal order.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureOrder = async () => {
    if (!orderPayload || !paypalConfig?.configured) return;
    try {
      setCapturing(true);
      const result = await api.capturePayPalOrder(orderPayload.paypalOrderId, approvalId!);
      await refreshCart();
      navigate(`/orders?success=true&orderId=${result.order.orderId}`);
    } catch (err: any) {
      alert(`Payment capture failed: ${err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center font-mono space-y-4"
        >
          <RefreshCw className="w-9 h-9 animate-spin text-brand-blue mx-auto" />
          <div>
            <h3 className="font-bold text-sm text-text">Communicating with PayPal AEGIS Gateway</h3>
            <p className="text-xs text-text-muted mt-1">Verifying cryptographic mandate fingerprint & currency bounds...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Missing Credentials or Error State (Phase 5A requirement)
  if (error) {
    const isNotConfigured = error.code === 'PAYPAL_NOT_CONFIGURED';

    return (
      <div className="min-h-screen bg-bg text-text py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          <Card className="p-8 shadow-soft-xl border-status-warning-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-status-warning-bg border border-status-warning-border flex items-center justify-center text-status-warning">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="warning" className="font-mono text-[11px] mb-1">
                  {error.code}
                </Badge>
                <h2 className="text-lg font-bold text-text">
                  {isNotConfigured ? 'PayPal Sandbox Configuration Required' : 'Payment Initialization Intercepted'}
                </h2>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed mb-6 font-sans">
              {error.message}
            </p>

            {isNotConfigured && (
              <div className="bg-bg-subtle border border-border rounded-xl p-4 mb-6 font-mono text-[11px] text-text-muted space-y-2">
                <div className="font-bold text-text flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Setup Instructions:</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  1. Open your PayPal Developer Dashboard at <code className="text-brand-blue">developer.paypal.com</code><br />
                  2. Copy your Sandbox <code className="text-text font-bold">Client ID</code> and <code className="text-text font-bold">Secret</code><br />
                  3. Add to <code className="text-brand-violet font-bold">server/.env</code>:<br />
                  <pre className="bg-surface p-2 rounded border border-border mt-1 text-[10px] overflow-x-auto">
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
                  </pre>
                  4. Restart the backend server.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate(`/passport?id=${passportId || ''}`)}
                variant="secondary"
                size="md"
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Return to Passport
              </Button>
              <Button
                onClick={() => navigate('/cart')}
                variant="outline"
                size="md"
              >
                View Cart
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Active PayPal Checkout Screen
  return (
    <div className="min-h-screen bg-bg text-text py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto"
      >
        <Card className="p-8 shadow-soft-xl border-border">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
            <div>
              <span className="font-black text-xl tracking-tight text-text">
                SHOPMATE<span className="text-brand-blue">.AI</span>
              </span>
              <span className="text-xs font-mono text-text-muted block mt-0.5">
                PAYPAL ORDERS V2 CHECKOUT
              </span>
            </div>

            <div className="flex items-center space-x-1 text-status-success font-mono text-[11px] font-bold bg-status-success-bg px-3 py-1 rounded-full border border-status-success-border">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HMAC MANDATE VERIFIED</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-bg-subtle rounded-2xl p-6 border border-border text-center mb-6">
            <span className="text-xs font-mono text-text-muted block mb-1">
              Authorized Payment Total
            </span>
            <div className="text-4xl font-black font-mono text-text mb-2 tabular-nums">
              ${orderPayload?.finalAmount || '0.00'}{' '}
              <span className="text-sm font-bold text-text-muted">{orderPayload?.currency || 'USD'}</span>
            </div>
            <div className="text-[11px] font-mono text-text-muted flex items-center justify-center space-x-1">
              <span>PayPal Order:</span>
              <code className="text-text font-semibold">{orderPayload?.paypalOrderId}</code>
            </div>
          </div>

          {/* Environment Status Badge */}
          <div className="bg-brand-blue-50 dark:bg-brand-blue-900/20 border border-brand-blue-100 dark:border-brand-blue-800/40 rounded-xl p-4 mb-6 text-xs text-brand-blue-700 dark:text-brand-blue-300">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <Lock className="w-4 h-4 text-brand-blue" />
              <span>PAYPAL ORDERS V2 SANDBOX INTEGRATION</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90 font-sans">
              Connected to official PayPal Sandbox REST API. Payment capture runs server-authoritatively through backend verification with duplicate replay protection.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {orderPayload?.approveUrl ? (
              <a
                href={orderPayload.approveUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 rounded-xl bg-[#0070BA] hover:bg-[#003087] text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <span>Authorize on PayPal Checkout</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}

            <Button
              onClick={handleCaptureOrder}
              disabled={capturing}
              variant="gradient"
              size="lg"
              className="w-full py-4 rounded-xl shadow-lg"
            >
              {capturing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Capturing Payment & Generating Order...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span>Capture Authorized Sandbox Payment</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate(`/passport?id=${passportId || ''}`)}
              variant="outline"
              size="md"
              className="w-full"
            >
              Back to Purchase Passport
            </Button>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span className="flex items-center space-x-1">
              <FileCheck2 className="w-3.5 h-3.5 text-brand-blue" />
              <span>Single-use mandate</span>
            </span>
            <span>15-min TTL protection</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
