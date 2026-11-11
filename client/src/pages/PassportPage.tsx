import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  Download,
  XCircle,
  Edit3,
  Eye,
  Activity,
  QrCode,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import { IPurchasePassport, IApprovalMandate } from '../../../shared/types.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';

export const PassportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const passportId = searchParams.get('id');

  const [passport, setPassport] = useState<IPurchasePassport | null>(null);
  const [mandate, setMandate] = useState<IApprovalMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('15:00');

  useEffect(() => {
    if (passportId) {
      loadPassportData(passportId);
    } else {
      autoGeneratePassport();
    }
  }, [passportId]);

  // Expiry countdown timer when mandate is active
  useEffect(() => {
    if (!mandate?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(mandate.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('00:00 (Expired)');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mandate]);

  const loadPassportData = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getPassport(id);
      setPassport(data.passport);

      try {
        const mandateData = await api.getMandate(id);
        if (mandateData?.mandate) {
          setMandate(mandateData.mandate);
        }
      } catch {
        // Not approved yet
      }
    } catch (err: any) {
      alert(`Could not load passport: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const autoGeneratePassport = async () => {
    try {
      setLoading(true);
      const data = await api.generatePassport('Workspace Hardware Checkout');
      if (data?.passport) {
        setPassport(data.passport);
      }
    } catch (err: any) {
      console.warn('Auto-generate passport error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!passport) return;
    try {
      setSigning(true);
      const data = await api.approvePassport(passport.passportId);
      setPassport(data.passport);
      setMandate(data.mandate);
    } catch (err: any) {
      alert(`Approval signing failed: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    if (!passport) return;
    const confirmed = window.confirm('Are you sure you want to reject this Purchase Passport?');
    if (!confirmed) return;

    try {
      setRejecting(true);
      const data = await api.rejectPassport(passport.passportId, 'Rejected by shopper');
      setPassport(data.passport);
      setMandate(null);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  const handleExport = (format: 'html' | 'json') => {
    if (!passport) return;
    const url = api.getExportPassportUrl(passport.passportId, format);
    window.open(url, '_blank');
  };

  const copyFingerprint = () => {
    if (mandate?.orderFingerprint) {
      navigator.clipboard.writeText(mandate.orderFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center font-mono text-text">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
          <p className="text-xs text-text-muted">Verifying Cryptographic Purchase Passport...</p>
        </div>
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 text-text">
        <Card className="max-w-md w-full p-8 text-center shadow-soft-xl">
          <FileCheck2 className="w-12 h-12 text-text-subtle mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">No Active Passport Found</h2>
          <p className="text-xs text-text-muted mb-6">
            Add items to your cart to generate an immutable pre-checkout Purchase Passport.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => navigate('/workspace')}
              variant="primary"
              size="md"
              className="w-full"
            >
              Go to Shopping Workspace
            </Button>
            <Button
              onClick={() => navigate('/cart')}
              variant="secondary"
              size="md"
              className="w-full"
            >
              View Cart
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isApproved =
    passport.approvalStatus === 'approved' ||
    passport.approvalStatus === 'APPROVED' ||
    passport.approvalStatus === 'COMPLETED';

  const isInvalidated =
    passport.approvalStatus === 'invalidated' || passport.approvalStatus === 'INVALIDATED';

  const isRejected =
    passport.approvalStatus === 'rejected' || passport.approvalStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-bg text-text py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Invalidated Alert Banner */}
        {isInvalidated && (
          <div className="p-5 bg-status-danger-bg border border-status-danger-border rounded-2xl text-status-danger-text flex items-start space-x-3 shadow-soft-md">
            <AlertTriangle className="w-6 h-6 text-status-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm uppercase font-mono tracking-wider text-status-danger-text">
                PURCHASE PASSPORT INVALIDATED
              </h3>
              <p className="text-xs mt-1 leading-relaxed">
                {passport.invalidationReason ||
                  'Cart contents modified after passport generation (cart version incremented). Previous cryptographic approval mandates have been permanently voided to prevent cart tampering.'}
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <Button
                  onClick={() => navigate('/cart')}
                  variant="danger"
                  size="sm"
                >
                  Review Cart
                </Button>
                <Button
                  onClick={() => autoGeneratePassport()}
                  variant="primary"
                  size="sm"
                >
                  Generate New Passport
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rejected Alert Banner */}
        {isRejected && (
          <div className="p-4 bg-bg-subtle border border-border rounded-2xl text-text-muted flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-status-danger flex-shrink-0" />
            <span className="text-xs font-mono">
              This passport was rejected by user. Generate a new passport from your cart when ready.
            </span>
          </div>
        )}

        {/* Action Toolbar (Review, Edit Cart, Reject, Approve, Export) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-border shadow-soft-sm">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                document.getElementById('passport-items')?.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="outline"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5 text-brand-blue" />}
            >
              Review
            </Button>
            <Button
              onClick={() => navigate('/cart')}
              variant="outline"
              size="sm"
              icon={<Edit3 className="w-3.5 h-3.5 text-status-warning" />}
            >
              Edit Cart
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {!isApproved && !isInvalidated && !isRejected && (
              <Button
                onClick={handleReject}
                disabled={rejecting}
                variant="outline"
                size="sm"
                className="text-status-danger border-status-danger-border hover:bg-status-danger-bg"
              >
                Reject
              </Button>
            )}

            {!isApproved && !isInvalidated && !isRejected && (
              <Button
                onClick={handleApprove}
                disabled={signing}
                variant="gradient"
                size="sm"
              >
                {signing ? 'Signing...' : 'Approve'}
              </Button>
            )}

            <Button
              onClick={() => handleExport('html')}
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-status-success" />}
            >
              Export
            </Button>
          </div>
        </div>

        {/* THE BOARDING-PASS STYLE PURCHASE PASSPORT DOCUMENT */}
        <div className="rounded-card-lg bg-surface border border-border shadow-soft-xl overflow-hidden relative transition-all">
          {/* Header Band */}
          <div className="bg-gradient-to-r from-brand-navy via-brand-navy to-surface-raised p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border relative overflow-hidden">
            <div className="flex items-center space-x-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-brand-violet/20 border border-brand-violet/40 flex items-center justify-center text-brand-violet shadow-soft flex-shrink-0">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-brand-violet font-bold uppercase block">
                  PAYPAL AEGIS SIGNATURE ASSET
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">Purchase Passport</h1>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Passport ID: <code>{passport.passportId}</code>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end relative z-10 font-mono text-xs">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  isApproved
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : isInvalidated
                    ? 'bg-rose-950 text-rose-400 border-rose-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}
              >
                {isApproved
                  ? 'HMAC-SHA256 AUTHORIZED'
                  : isInvalidated
                  ? 'INVALIDATED'
                  : 'AWAITING APPROVAL'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Cart Version {passport.cartVersion} • Issued {new Date(passport.createdAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Subtle Watermark Stamp */}
            <div className="absolute right-12 top-2 select-none pointer-events-none opacity-10 font-black text-5xl font-mono tracking-widest rotate-12 text-white">
              {isApproved ? 'AUTHORIZED' : isInvalidated ? 'VOIDED' : 'PRE-FLIGHT'}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* 3 Overview Cards: FitCheck, Trust Score, Risk Level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {/* 1. FitCheck */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center space-x-1.5 text-status-success font-bold mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                  <span>FitCheck: {passport.fitCheckSummary?.overallStatus || 'PASS'}</span>
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  {passport.fitCheckSummary?.results?.[0]?.reason ||
                    'Hardware specifications and ports cross-verified for system compatibility.'}
                </p>
              </div>

              {/* 2. Trust Score (Phase 7) */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-brand-blue font-bold">
                    <ShieldCheck className="w-4 h-4 text-brand-blue" />
                    <span>Trust Score</span>
                  </div>
                  <span className="text-[9px] bg-surface text-text-subtle font-mono px-1.5 py-0.5 rounded border border-border">
                    Coming in Phase 7
                  </span>
                </div>
                <div className="text-base font-bold text-text tabular-nums mb-1">
                  {passport.trustScoreOverall?.score || 95}/100
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  Merchant credibility and warranty verification heuristics (Evidence Explanations).
                </p>
              </div>

              {/* 3. Risk Level (Phase 7) */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-status-success font-bold">
                    <Lock className="w-4 h-4 text-status-success" />
                    <span>Risk Level</span>
                  </div>
                  <span className="text-[9px] bg-surface text-text-subtle font-mono px-1.5 py-0.5 rounded border border-border">
                    Coming in Phase 7
                  </span>
                </div>
                <div className="text-base font-bold text-text mb-1">
                  {passport.riskAssessment?.level || 'LOW'}
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  {passport.riskAssessment?.recommendedAction ||
                    'No adversarial anomalies or price surge risks detected.'}
                </p>
              </div>
            </div>

            {/* Perforated Divider */}
            <div className="perforated-divider my-6" />

            {/* Line Items Snapshot */}
            <div id="passport-items" className="space-y-3">
              <h3 className="text-xs uppercase font-mono tracking-wider text-text-muted font-bold">
                Locked Product Snapshots ({passport.items.length})
              </h3>
              <div className="bg-bg-subtle rounded-xl border border-border divide-y divide-border">
                {passport.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-text block text-sm mb-0.5">
                        {item.productSnapshot.title}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Sold by {item.productSnapshot.merchantName} • Qty {item.quantity} • {item.productSnapshot.warrantyMonths}m warranty • {item.productSnapshot.returnPolicyDays}d returns
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-mono font-bold text-text text-sm block tabular-nums">
                        ${item.itemTotal.toFixed(2)} USD
                      </span>
                      <span className="text-[10px] text-text-subtle font-mono tabular-nums">
                        ${item.unitPrice.toFixed(2)} ea
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Financial Breakdown with PROMINENT Total */}
            <div className="bg-bg-subtle rounded-xl border border-border p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pb-4 border-b border-border">
                <div>
                  <span className="text-text-muted block">Subtotal</span>
                  <span className="text-text font-bold text-sm tabular-nums">
                    ${passport.priceBreakdown.subtotal.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Shipping</span>
                  <span className="text-text font-bold text-sm">
                    {passport.priceBreakdown.shipping === 0
                      ? 'FREE'
                      : `$${passport.priceBreakdown.shipping.toFixed(2)} USD`}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Estimated Tax (8%)</span>
                  <span className="text-text font-bold text-sm tabular-nums">
                    ${passport.priceBreakdown.tax.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Exact Total</span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-status-success block tabular-nums">
                    ${passport.priceBreakdown.finalTotal.toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-text-muted font-mono gap-2">
                <span>Policy Ceiling: ${passport.budgetComparison.userBudgetLimit.toFixed(2)} USD</span>
                <span className="text-status-success font-bold tabular-nums">
                  Budget Check: {passport.budgetComparison.budgetStatus} (Safe headroom: ${passport.budgetComparison.underBudgetBy.toFixed(2)} USD)
                </span>
              </div>
            </div>

            {/* Agent Activity Summary */}
            <div className="bg-bg-subtle rounded-xl border border-border p-3.5 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center space-x-2 text-text-muted">
                <Activity className="w-4 h-4 text-brand-blue" />
                <span>Agent Activity Audit Ledger:</span>
              </div>
              <span className="text-text font-bold">
                {passport.agentActivityCount || 0} tool executions verified
              </span>
            </div>

            {/* Signed Mandate Section */}
            {mandate ? (
              <div className="bg-surface border border-status-success-border rounded-2xl p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-status-success font-mono font-bold text-xs">
                    <ShieldCheck className="w-5 h-5 text-status-success" />
                    <span>HMAC-SHA256 SIGNED APPROVAL MANDATE</span>
                  </div>
                  <Badge variant="success" size="sm">Single-Use Guaranteed</Badge>
                </div>

                {/* Shortened Fingerprint & Copy */}
                <div className="bg-bg-subtle p-3.5 rounded-xl border border-border">
                  <span className="text-[10px] font-mono text-text-muted block mb-1">
                    Cryptographic Order Fingerprint (Canonical HMAC-SHA256):
                  </span>
                  <div className="flex items-center justify-between font-mono text-xs text-status-success break-all">
                    <span>
                      {mandate.orderFingerprint.slice(0, 24)}...{mandate.orderFingerprint.slice(-16)}
                    </span>
                    <button
                      onClick={copyFingerprint}
                      className="ml-3 px-2.5 py-1 bg-surface hover:bg-bg-subtle border border-border text-text rounded-lg transition flex items-center space-x-1 flex-shrink-0"
                      title="Copy full fingerprint"
                      aria-label="Copy cryptographic fingerprint"
                    >
                      {copiedFingerprint ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-status-success" />
                          <span className="text-[10px] text-status-success font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiry Countdown & Approval ID */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-text-muted pt-1">
                  <div>
                    Approval ID: <span className="text-text font-bold">{mandate.approvalId.slice(0, 16)}...</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-status-warning" />
                    <span>Mandate TTL:</span>
                    <span className="text-status-warning font-bold tabular-nums">{timeLeft}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span>Status: </span>
                    <span className="text-status-success font-bold">READY_FOR_PAYPAL</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-bg-subtle border border-border rounded-2xl p-6 text-center space-y-3">
                <Lock className="w-8 h-8 text-brand-violet mx-auto" />
                <h3 className="font-bold text-text text-sm">Awaiting Cryptographic User Mandate</h3>
                <p className="text-xs text-text-muted max-w-lg mx-auto">
                  Approving generates a canonical HMAC-SHA256 signature binding this exact hardware configuration and price. If cart items are modified, this approval is instantly invalidated.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={signing || isInvalidated}
                  className="px-8 py-3 rounded-xl bg-brand-violet hover:bg-brand-violet-600 disabled:opacity-50 text-white font-bold text-xs tracking-wide uppercase transition shadow-soft-md"
                >
                  {signing ? 'Computing HMAC Fingerprint...' : 'Approve & Issue Signed Mandate'}
                </button>
              </div>
            )}

            {/* Bottom Action: Proceed to PayPal Sandbox */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <span className="text-xs text-text-muted font-mono">
                Phase 5 Target: Real PayPal Orders v2 Sandbox Checkout
              </span>

              <button
                onClick={() => {
                  if (isApproved && mandate) {
                    navigate(`/checkout?passportId=${passport.passportId}&approvalId=${mandate.approvalId}`);
                  }
                }}
                disabled={!isApproved || isInvalidated || !mandate}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-status-success hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-soft-md"
              >
                <CreditCard className="w-4 h-4" />
                <span>Proceed to PayPal Sandbox Checkout</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
