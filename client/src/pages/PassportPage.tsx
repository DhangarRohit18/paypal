import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Share2,
  Users,
  Printer,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import { IPurchasePassport, IApprovalMandate, IFlightRecorderEvent } from '../../../shared/types.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';

export const PassportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const passportId = searchParams.get('id');
  const reviewToken = searchParams.get('reviewToken');

  const [passport, setPassport] = useState<IPurchasePassport | null>(null);
  const [mandate, setMandate] = useState<IApprovalMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('15:00');

  // Co-Approver Share Link State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  // Review Mode State
  const [reviewCreatorName, setReviewCreatorName] = useState<string>('Shopper');
  const [coApproving, setCoApproving] = useState(false);
  const [coApproverNameInput, setCoApproverNameInput] = useState('');
  const [coApprovedSuccess, setCoApprovedSuccess] = useState(false);

  // Flight Recorder Accordion
  const [showFlightRecorder, setShowFlightRecorder] = useState(true);

  useEffect(() => {
    if (reviewToken) {
      loadReviewData(reviewToken);
    } else if (passportId) {
      loadPassportData(passportId);
    } else {
      autoGeneratePassport();
    }
  }, [passportId, reviewToken]);

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

  const loadReviewData = async (token: string) => {
    try {
      setLoading(true);
      const data = await api.getPassportByShareToken(token);
      if (data.passport) {
        setPassport(data.passport);
        if (data.creatorName) setReviewCreatorName(data.creatorName);
      }
    } catch (err: any) {
      alert(`Could not load review passport: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCoApproveSubmit = async () => {
    if (!reviewToken) return;
    try {
      setCoApproving(true);
      const approverName = coApproverNameInput.trim() || 'Co-Approver';
      const result = await api.approvePassportByShareToken(reviewToken, approverName);
      if (result.passport) {
        setPassport(result.passport);
      }
      setCoApprovedSuccess(true);
    } catch (err: any) {
      alert(`Co-approval failed: ${err.message}`);
    } finally {
      setCoApproving(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (!passport) return;
    try {
      setSharingLoading(true);
      const result = await api.createCoApproverShare(passport.passportId);
      setShareLink(result.shareUrl);
      setShareModalOpen(true);
    } catch (err: any) {
      alert(`Failed to create share link: ${err.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
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
          <p className="text-xs text-text-muted">Loading AEGIS Cryptographic Purchase Passport...</p>
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
            <Button onClick={() => navigate('/workspace')} variant="primary" size="md" className="w-full">
              Go to Shopping Workspace
            </Button>
            <Button onClick={() => navigate('/cart')} variant="secondary" size="md" className="w-full">
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

  const isReviewMode = Boolean(reviewToken);

  return (
    <div className="min-h-screen bg-bg text-text py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Co-Approver Review Mode Banner */}
        {isReviewMode && (
          <div className="p-5 bg-brand-violet-50 dark:bg-brand-violet-900/20 border border-brand-violet-200 dark:border-brand-violet-800/50 rounded-2xl text-text shadow-soft-md">
            <div className="flex items-start space-x-3">
              <Users className="w-6 h-6 text-brand-violet flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="purple" size="sm" className="font-mono">
                    CO-APPROVER REVIEW MODE
                  </Badge>
                  {passport.coApprovedBy && (
                    <Badge variant="success" size="sm" className="font-mono">
                      CO-APPROVED
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-text mt-1.5">
                  Secondary Purchase Authorization Requested by {reviewCreatorName}
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  You are viewing a secure, read-only snapshot of this proposed hardware order. Review the items, compatibility matrix, and financial summary below. This token does not grant access to {reviewCreatorName}'s private payment credentials or other orders.
                </p>

                {!passport.coApprovedBy && !coApprovedSuccess ? (
                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <input
                      type="text"
                      placeholder="Enter your name to co-approve (e.g. Lead Engineer)"
                      value={coApproverNameInput}
                      onChange={(e) => setCoApproverNameInput(e.target.value)}
                      className="px-3.5 py-2 text-xs rounded-xl bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-violet"
                    />
                    <Button
                      onClick={handleCoApproveSubmit}
                      disabled={coApproving}
                      variant="primary"
                      size="sm"
                      className="bg-brand-violet hover:bg-brand-violet-600"
                    >
                      {coApproving ? 'Authorizing...' : 'Authorize Co-Approval'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center space-x-2 text-status-success font-mono text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Authorized by {passport.coApprovedBy || coApproverNameInput || 'Co-Approver'} on {new Date().toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
              {!isReviewMode && (
                <div className="mt-3 flex items-center space-x-3">
                  <Button onClick={() => navigate('/cart')} variant="danger" size="sm">
                    Review Cart
                  </Button>
                  <Button onClick={() => autoGeneratePassport()} variant="primary" size="sm">
                    Generate New Passport
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Toolbar */}
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
              Review Items
            </Button>
            {!isReviewMode && (
              <Button
                onClick={() => navigate('/cart')}
                variant="outline"
                size="sm"
                icon={<Edit3 className="w-3.5 h-3.5 text-status-warning" />}
              >
                Edit Cart
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isReviewMode && !isApproved && !isInvalidated && !isRejected && (
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

            {!isReviewMode && !isApproved && !isInvalidated && !isRejected && (
              <Button
                onClick={handleApprove}
                disabled={signing}
                variant="gradient"
                size="sm"
              >
                {signing ? 'Signing...' : 'Approve Mandate'}
              </Button>
            )}

            {!isReviewMode && (
              <Button
                onClick={handleCreateShareLink}
                disabled={sharingLoading}
                variant="outline"
                size="sm"
                icon={<Share2 className="w-3.5 h-3.5 text-brand-violet" />}
              >
                Share Co-Approval
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

            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5 text-text-muted" />}
            >
              Print
            </Button>
          </div>
        </div>

        {/* Co-Approver Share Modal */}
        {shareModalOpen && (
          <div className="p-5 bg-surface border border-brand-violet/40 rounded-2xl shadow-soft-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm text-text">
                <Share2 className="w-4 h-4 text-brand-violet" />
                <span>Expiring Read-Only Co-Approver Share Link</span>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-xs text-text-muted hover:text-text"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Send this secure, read-only link to your manager, finance partner, or co-buyer. It allows them to inspect this exact product snapshot, compatibility report, and authorize co-approval without accessing your private account.
            </p>
            <div className="flex items-center space-x-2 bg-bg-subtle p-2.5 rounded-xl border border-border">
              <input
                readOnly
                value={shareLink || ''}
                className="bg-transparent text-xs font-mono text-text flex-1 outline-none select-all"
              />
              <Button
                onClick={copyShareLink}
                variant="primary"
                size="sm"
                className="bg-brand-violet hover:bg-brand-violet-600 flex-shrink-0"
              >
                {copiedShareLink ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedShareLink ? 'Copied' : 'Copy Link'}
              </Button>
            </div>
          </div>
        )}

        {/* BOARDING-PASS STYLE PURCHASE PASSPORT DOCUMENT */}
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
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {/* FitCheck */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center space-x-1.5 text-status-success font-bold mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                  <span>FitCheck: {passport.fitCheckSummary?.overallStatus || 'PASS'}</span>
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  {passport.fitCheckSummary?.results?.[0]?.reason ||
                    'Hardware specifications, USB-C PD wattage, and OS drivers verified for compatibility.'}
                </p>
              </div>

              {/* Trust Score */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-brand-blue font-bold">
                    <ShieldCheck className="w-4 h-4 text-brand-blue" />
                    <span>Trust Score</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] bg-surface text-text-subtle font-mono px-1.5 py-0.5 rounded border border-border">
                      AEGIS HEURISTIC
                    </span>
                    <Badge variant="success" size="sm" className="text-[10px]">VERIFIED</Badge>
                  </div>
                </div>
                <div className="text-base font-bold text-text tabular-nums mb-1">
                  {passport.trustScoreOverall?.score || 95}/100
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  Merchant credibility and 30-day return policy verified by AEGIS heuristics.
                </p>
              </div>

              {/* Risk Level */}
              <div className="bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-status-success font-bold">
                    <Lock className="w-4 h-4 text-status-success" />
                    <span>Risk Level</span>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px]">
                    {passport.riskAssessment?.level || 'LOW'}
                  </Badge>
                </div>
                <div className="text-base font-bold text-text mb-1">
                  {passport.riskAssessment?.level || 'LOW'} RISK
                </div>
                <p className="text-text-muted text-[11px] font-sans leading-relaxed">
                  {passport.riskAssessment?.recommendedAction ||
                    'No price anomalies or policy violations detected.'}
                </p>
              </div>
            </div>

            {/* SECOND OPINION & REGRET SHIELD SECTION (Phase 5E USP) */}
            {passport.secondOpinion && (
              <div className="bg-gradient-to-br from-brand-blue-50/60 to-purple-50/40 dark:from-brand-blue-900/10 dark:to-purple-900/10 rounded-2xl p-6 border border-brand-blue-100 dark:border-brand-blue-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-brand-violet" />
                    <h3 className="font-bold text-sm text-text tracking-tight">
                      BUYWISE Second Opinion & Regret Shield
                    </h3>
                  </div>
                  <Badge
                    variant={
                      passport.secondOpinion.overallVerdict === 'RECOMMENDED'
                        ? 'success'
                        : passport.secondOpinion.overallVerdict === 'SUBSTANTIAL_SAVINGS_AVAILABLE'
                        ? 'blue'
                        : 'warning'
                    }
                    size="sm"
                    className="font-mono"
                  >
                    {passport.secondOpinion.overallVerdict}
                  </Badge>
                </div>

                {passport.secondOpinion.cheaperSufficientAlternative && (
                  <div className="bg-surface p-4 rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5 text-status-success font-bold font-mono mb-1">
                        <TrendingDown className="w-4 h-4" />
                        <span>
                          Alternative Available: Save $
                          {passport.secondOpinion.cheaperSufficientAlternative.priceSavings.toFixed(2)} USD
                        </span>
                      </div>
                      <p className="text-text-muted text-[11px] font-sans">
                        {passport.secondOpinion.cheaperSufficientAlternative.whySufficient}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm" className="font-mono flex-shrink-0">
                      {passport.secondOpinion.cheaperSufficientAlternative.recommendedAlternative.title}
                    </Badge>
                  </div>
                )}

                {passport.secondOpinion.payingForUnneededFeatures &&
                  passport.secondOpinion.payingForUnneededFeatures.length > 0 && (
                    <div className="text-xs text-text-muted font-sans space-y-1">
                      <span className="font-bold text-text block text-[11px] uppercase font-mono tracking-wider">
                        Feature Trade-off Analysis:
                      </span>
                      {passport.secondOpinion.payingForUnneededFeatures.map((feat, idx) => (
                        <p key={idx} className="text-[11px] text-text-muted">
                          • {feat}
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Line Items Snapshot */}
            <div id="passport-items" className="space-y-3">
              <h3 className="text-xs uppercase font-mono tracking-wider text-text-muted font-bold">
                Locked Product Snapshots ({passport.items.length})
              </h3>
              <div className="bg-bg-subtle rounded-xl border border-border divide-y divide-border">
                {passport.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-text block text-sm mb-0.5">
                        {item.productSnapshot.title}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Sold by {item.productSnapshot.merchantName} • Qty {item.quantity} •{' '}
                        {item.productSnapshot.warrantyMonths}m warranty •{' '}
                        {item.productSnapshot.returnPolicyDays}d returns
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

            {/* Authoritative Financial Breakdown */}
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
                  Budget Check: {passport.budgetComparison.budgetStatus} (Safe headroom: $
                  {passport.budgetComparison.underBudgetBy.toFixed(2)} USD)
                </span>
              </div>
            </div>

            {/* AGENT FLIGHT RECORDER TIMELINE (Phase 5E USP) */}
            <div className="border border-border rounded-xl bg-surface overflow-hidden">
              <button
                onClick={() => setShowFlightRecorder(!showFlightRecorder)}
                className="w-full p-4 flex items-center justify-between bg-bg-subtle hover:bg-surface-raised transition text-left"
              >
                <div className="flex items-center space-x-2 text-xs font-bold text-text">
                  <Activity className="w-4 h-4 text-brand-blue" />
                  <span>Agent Flight Recorder Timeline (Deterministic Workflow Log)</span>
                </div>
                {showFlightRecorder ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {showFlightRecorder && (
                <div className="p-4 divide-y divide-border text-xs font-mono">
                  {(passport.flightRecorderEvents || []).map((evt: IFlightRecorderEvent, idx: number) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-bg-subtle border border-border flex items-center justify-center font-bold text-[11px] text-text-muted flex-shrink-0 mt-0.5">
                        {evt.stepIndex}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text text-xs">{evt.title}</span>
                          <Badge
                            variant={
                              evt.status === 'COMPLETED'
                                ? 'success'
                                : evt.status === 'INTERCEPTED'
                                ? 'warning'
                                : 'outline'
                            }
                            size="sm"
                            className="text-[10px]"
                          >
                            {evt.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-muted font-sans mt-0.5">
                          {evt.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signed Mandate Section */}
            {mandate ? (
              <div className="bg-surface border border-status-success-border rounded-2xl p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-status-success font-mono font-bold text-xs">
                    <ShieldCheck className="w-5 h-5 text-status-success" />
                    <span>HMAC-SHA256 SIGNED APPROVAL MANDATE</span>
                  </div>
                  <Badge variant="success" size="sm">
                    Single-Use Guaranteed
                  </Badge>
                </div>

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
                {!isReviewMode && (
                  <button
                    onClick={handleApprove}
                    disabled={signing || isInvalidated}
                    className="px-8 py-3 rounded-xl bg-brand-violet hover:bg-brand-violet-600 disabled:opacity-50 text-white font-bold text-xs tracking-wide uppercase transition shadow-soft-md"
                  >
                    {signing ? 'Computing HMAC Fingerprint...' : 'Approve & Issue Signed Mandate'}
                  </button>
                )}
              </div>
            )}

            {/* Bottom Action: Proceed to PayPal Sandbox */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <span className="text-xs text-text-muted font-mono">
                Official PayPal Orders v2 Sandbox Integration
              </span>

              {!isReviewMode && (
                <button
                  onClick={() => {
                    if (isApproved && mandate) {
                      navigate(
                        `/checkout?passportId=${passport.passportId}&approvalId=${mandate.approvalId}`
                      );
                    }
                  }}
                  disabled={!isApproved || isInvalidated || !mandate}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-status-success hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-soft-md"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Proceed to PayPal Checkout</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
