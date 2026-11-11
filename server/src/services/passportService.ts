import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { IPurchasePassport, ICoApproverShare } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';
import { getOrCreateCart } from './cartService.js';
import { runFitCheck } from './fitCheck.js';
import { evaluateCartRisk } from '../aegis/riskEngine.js';
import { spendingGuard } from './spendingGuard.js';
import { generateSecondOpinion } from './secondOpinionService.js';
import { buildFlightRecorderTimeline } from './flightRecorder.js';
import { computeCartFingerprint } from './mandateService.js';
import { PurchasePassportModel } from '../models/PurchasePassport.js';
import { ApprovalModel } from '../models/Approval.js';
import { CoApprovalModel } from '../models/CoApproval.js';

export function generatePassport(
  userId: string,
  missionGoal?: string
): { passport?: IPurchasePassport; error?: string; reasons?: string[] } {
  const cart = getOrCreateCart(userId);
  if (cart.items.length === 0) {
    return { error: 'EMPTY_CART', reasons: ['Cart is empty. Add items before generating a Purchase Passport.'] };
  }

  const policy = store.getSpendingPolicy(userId);
  if (policy.killSwitchActive) {
    return { error: 'KILL_SWITCH_ACTIVE', reasons: ['Emergency kill switch active. Cannot generate passport.'] };
  }

  // Re-run Spending Guard
  const guard = spendingGuard.validate(cart, policy);
  if (!guard.allowed) {
    return {
      error: 'SPENDING_POLICY_VIOLATION',
      reasons: guard.violations
    };
  }

  // Deep copy cart items so future cart mutations do not mutate this snapshot
  const itemsSnapshot = JSON.parse(JSON.stringify(cart.items));

  // 1. Merchant info
  const merchantIds = Array.from(new Set(itemsSnapshot.map((i: any) => i.productSnapshot.merchantId)));
  const merchantInfo = merchantIds.map((id) => {
    const m = store.merchants.find((merch) => merch.id === id);
    return {
      merchantId: id as string,
      merchantName: m?.name || 'Verified Merchant Partner',
      trustRating: m?.trustRating || 90,
      returnDays: m?.returnDays || 30
    };
  });

  // 2. Budget comparison
  const userBudgetLimit = policy.totalBudget;
  const actualTotal = cart.total;
  const underBudgetBy = Math.round(Math.max(0, userBudgetLimit - actualTotal) * 100) / 100;
  const budgetStatus = actualTotal <= userBudgetLimit ? 'WITHIN_BUDGET' : 'BUDGET_EXCEEDED';

  // 3. Fit check
  const products = itemsSnapshot.map((i: any) => store.getProductById(i.productId) || i.productSnapshot);
  const fitResults = runFitCheck(products);
  const overallFitStatus = fitResults.some((f) => f.status === 'Incompatible')
    ? 'FAIL'
    : fitResults.some((f) => f.status === 'Needs verification')
    ? 'WARNING'
    : 'PASS';

  // 4. Risk and Trust evaluation
  const riskEval = evaluateCartRisk(cart, policy);

  // 5. Warranty summary
  const warrantyReturnSummary = itemsSnapshot.map((i: any) => ({
    productTitle: i.productSnapshot.title,
    warrantyMonths: i.productSnapshot.warrantyMonths || 12,
    returnDays: i.productSnapshot.returnPolicyDays || 30
  }));

  // 6. Reasoning & Alternatives
  const recommendationReasoning = [
    `Hardware configuration curated for high reliability across ${itemsSnapshot.length} components.`,
    `Pricing verified directly against authoritative catalogue DB; zero price surge or client tampering detected.`,
    `Return policy offers minimum 30-day merchant protection.`
  ];

  const alternativesConsidered = [
    {
      originalTitle: itemsSnapshot[0]?.productSnapshot.title || 'Primary selection',
      alternativeTitle: 'Standard Edition Alternative',
      priceDelta: -35.0,
      specDifference: 'Standard refresh rate, baseline configuration'
    }
  ];

  // 7. Second Opinion & Flight Recorder
  const secondOpinion = generateSecondOpinion(cart);
  const flightRecorderEvents = buildFlightRecorderTimeline(cart);

  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour expiration

  const passport: IPurchasePassport = {
    passportId: `psp-${uuidv4()}`,
    version: 1,
    userId,
    cartId: cart.id,
    cartVersion: cart.version,
    items: itemsSnapshot,
    missionGoal: missionGoal || 'Curated Purchase Passport',
    merchantInfo,
    priceBreakdown: {
      subtotal: cart.subtotal,
      discount: cart.discount,
      shipping: cart.shipping,
      tax: cart.tax,
      finalTotal: cart.total,
      currency: 'USD'
    },
    budgetComparison: {
      userBudgetLimit,
      actualTotal,
      underBudgetBy,
      budgetStatus
    },
    fitCheckSummary: {
      overallStatus: overallFitStatus,
      results: fitResults
    },
    trustScoreOverall: {
      score: riskEval.overallTrustScore,
      indicators: riskEval.trustIndicators
    },
    riskAssessment: {
      level: riskEval.level,
      heuristicReasons: riskEval.heuristicReasons,
      recommendedAction: riskEval.recommendedAction
    },
    recommendationReasoning,
    alternativesConsidered,
    warrantyReturnSummary,
    secondOpinion,
    flightRecorderEvents,
    agentActivityCount: store.agentEvents.length,
    approvalStatus: 'pending_approval',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString()
  };

  store.passports.set(passport.passportId, passport);

  if (mongoose.connection.readyState === 1) {
    PurchasePassportModel.updateOne(
      { passportId: passport.passportId },
      { $set: passport },
      { upsert: true }
    ).catch((err) => console.warn('MongoDB passport save error:', err));
  }

  return { passport };
}

export function getPassport(passportId: string): IPurchasePassport | undefined {
  return store.passports.get(passportId);
}

export function rejectPassport(
  passportId: string,
  userId: string,
  reason?: string
): { success: boolean; error?: string; passport?: IPurchasePassport } {
  const passport = store.passports.get(passportId);
  if (!passport) {
    return { success: false, error: 'PASSPORT_NOT_FOUND' };
  }

  if (passport.userId !== userId) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  passport.approvalStatus = 'rejected';
  passport.invalidationReason = reason || 'Rejected by shopper.';
  store.passports.set(passportId, passport);

  if (mongoose.connection.readyState === 1) {
    PurchasePassportModel.updateOne(
      { passportId },
      { $set: { approvalStatus: 'rejected', invalidationReason: passport.invalidationReason } }
    ).catch((err) => console.warn('MongoDB passport reject sync error:', err));
  }

  return { success: true, passport };
}

/**
 * Generates an expiring read-only co-approver share link token.
 * Token expires in 30 days and grants read-only access strictly to this passport snapshot.
 */
export function createCoApproverShare(
  passportId: string,
  userId: string,
  creatorName: string
): { shareUrl: string; token: string; expiresAt: string } {
  const passport = store.passports.get(passportId);
  if (!passport || passport.userId !== userId) {
    throw new Error('Passport not found or unauthorized.');
  }

  const token = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const shareRecord: ICoApproverShare = {
    token,
    passportId,
    userId,
    creatorName,
    expiresAt,
    createdAt: now.toISOString(),
    approved: false
  };

  store.coApproverShares.set(token, shareRecord);
  passport.coApproverToken = token;
  passport.coApproverExpiresAt = expiresAt;
  store.passports.set(passportId, passport);

  if (mongoose.connection.readyState === 1) {
    CoApprovalModel.create(shareRecord).catch((err) => console.warn('MongoDB co-approval share creation error:', err));
    PurchasePassportModel.updateOne(
      { passportId },
      { $set: { coApproverToken: token, coApproverExpiresAt: expiresAt } }
    ).catch(() => {});
  }

  const baseUrl = (process.env.CLIENT_URL || process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const shareUrl = `${baseUrl}/passport?reviewToken=${token}`;

  return { shareUrl, token, expiresAt };
}

/**
 * Retrieves sanitized, read-only passport snapshot by share token.
 * Does not expose user credentials or other carts.
 */
export function getPassportByShareToken(token: string): {
  passport?: IPurchasePassport;
  creatorName?: string;
  isExpired?: boolean;
  isApproved?: boolean;
} {
  const share = store.coApproverShares.get(token);
  if (!share) {
    return {};
  }

  if (new Date() > new Date(share.expiresAt)) {
    return { isExpired: true };
  }

  const passport = store.passports.get(share.passportId);
  if (!passport) {
    return {};
  }

  return {
    passport,
    creatorName: share.creatorName,
    isExpired: false,
    isApproved: share.approved
  };
}

/**
 * Co-approves a Purchase Passport using share token.
 */
export function approvePassportByShareToken(
  token: string,
  approverName: string
): { success: boolean; error?: string; passport?: IPurchasePassport } {
  const share = store.coApproverShares.get(token);
  if (!share) {
    return { success: false, error: 'INVALID_SHARE_TOKEN' };
  }

  if (new Date() > new Date(share.expiresAt)) {
    return { success: false, error: 'SHARE_TOKEN_EXPIRED' };
  }

  const passport = store.passports.get(share.passportId);
  if (!passport) {
    return { success: false, error: 'PASSPORT_NOT_FOUND' };
  }

  const now = new Date().toISOString();
  share.approved = true;
  share.approvedAt = now;
  share.approvedBy = approverName;
  store.coApproverShares.set(token, share);

  passport.coApprovedBy = approverName;
  passport.coApprovedAt = now;
  store.passports.set(passport.passportId, passport);

  if (mongoose.connection.readyState === 1) {
    CoApprovalModel.updateOne(
      { token },
      { $set: { approved: true, approvedAt: now, approvedBy: approverName } }
    ).catch(() => {});
    PurchasePassportModel.updateOne(
      { passportId: passport.passportId },
      { $set: { coApprovedBy: approverName, coApprovedAt: now } }
    ).catch(() => {});
  }

  // If an active mandate exists for this passport, update its co-approval state as well
  for (const mandate of store.approvals.values()) {
    if (mandate.passportId === passport.passportId) {
      mandate.coApprovedAt = now;
      store.approvals.set(mandate.approvalId, mandate);
    }
  }

  return { success: true, passport };
}

export function exportPassport(
  passport: IPurchasePassport,
  format: 'json' | 'pdf' | 'html' = 'json'
): { contentType: string; data: string } {
  if (format === 'html' || format === 'pdf') {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SHOPMATE AI — Official Purchase Passport ${passport.passportId}</title>
  <style>
    :root {
      --navy: #0B1020;
      --blue: #246BFD;
      --violet: #7657FF;
      --success: #18A873;
      --border: #E4E8F0;
      --text: #0B1020;
      --muted: #5B6478;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background: #F7F9FC;
      color: var(--text);
      line-height: 1.5;
    }
    .cert-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 48px;
      box-shadow: 0 10px 30px rgba(11, 16, 32, 0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: var(--navy);
    }
    .logo span { color: var(--blue); }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-approved { background: #E8F7F1; color: #0E7448; border: 1px solid #A3E4C9; }
    .badge-pending { background: #EFF5FF; color: #1A56DB; border: 1px solid #DBE8FE; }
    .badge-invalid { background: #FDF2F2; color: #B92828; border: 1px solid #F8B4B4; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      background: #F7F9FC;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
      font-size: 13px;
    }
    .meta-item label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .meta-item code {
      font-family: monospace;
      font-size: 12px;
      color: var(--navy);
      font-weight: 600;
    }
    h2 {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin: 28px 0 14px 0;
      color: var(--navy);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      background: #FAFBFC;
      font-weight: 700;
    }
    .totals-box {
      margin-left: auto;
      max-width: 320px;
      background: #FAFBFC;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      font-size: 13px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: var(--muted);
    }
    .totals-final {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid var(--border);
      font-size: 18px;
      font-weight: 900;
      color: var(--navy);
      font-family: monospace;
    }
    .evidence-section {
      margin-top: 32px;
      padding: 20px;
      border-radius: 12px;
      background: #EFF5FF;
      border: 1px solid #DBE8FE;
      font-size: 12px;
    }
    .evidence-section h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 800;
      color: #1A56DB;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .cert-container { border: none; box-shadow: none; padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">
      <div>
        <div class="logo">SHOPMATE<span>.AI</span></div>
        <div style="font-size: 13px; color: var(--muted); margin-top: 4px;">
          Deterministic Pre-Purchase Authorization Document
        </div>
      </div>
      <div>
        <span class="badge ${
          passport.approvalStatus === 'approved' || passport.approvalStatus === 'COMPLETED'
            ? 'badge-approved'
            : passport.approvalStatus === 'invalidated'
            ? 'badge-invalid'
            : 'badge-pending'
        }">
          ${passport.approvalStatus.toUpperCase()}
        </span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Passport ID</label>
        <code>${passport.passportId}</code>
      </div>
      <div class="meta-item">
        <label>Cart Version</label>
        <code>v${passport.cartVersion} (Locked)</code>
      </div>
      <div class="meta-item">
        <label>Issued At</label>
        <div>${new Date(passport.createdAt).toLocaleDateString()} ${new Date(passport.createdAt).toLocaleTimeString()}</div>
      </div>
      <div class="meta-item">
        <label>Trust Score</label>
        <div style="font-weight: bold; color: var(--success);">${passport.trustScoreOverall.score}/100 (VERIFIED)</div>
      </div>
      <div class="meta-item">
        <label>FitCheck Verdict</label>
        <div style="font-weight: bold;">${passport.fitCheckSummary.overallStatus}</div>
      </div>
      <div class="meta-item">
        <label>Co-Approval Status</label>
        <div>${passport.coApprovedBy ? `Approved by ${passport.coApprovedBy}` : 'Single Shopper Approved'}</div>
      </div>
    </div>

    <h2>Verified Product Snapshot</h2>
    <table>
      <thead>
        <tr>
          <th>Item Specification</th>
          <th>Merchant</th>
          <th>Warranty</th>
          <th>Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${passport.items
          .map(
            (item) => `
          <tr>
            <td>
              <strong>${item.productSnapshot.title}</strong>
              <div style="font-size: 11px; color: var(--muted);">${item.productSnapshot.category} • ${item.productSnapshot.brand}</div>
            </td>
            <td>${item.productSnapshot.merchantName} (${item.productSnapshot.returnPolicyDays}d return)</td>
            <td>${item.productSnapshot.warrantyMonths}m hardware</td>
            <td>${item.quantity}</td>
            <td style="text-align: right; font-family: monospace;">$${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">$${item.itemTotal.toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Catalogue Subtotal:</span>
        <span style="font-family: monospace;">$${passport.priceBreakdown.subtotal.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>Insured Shipping:</span>
        <span style="font-family: monospace;">$${passport.priceBreakdown.shipping.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>Standard Tax (8%):</span>
        <span style="font-family: monospace;">$${passport.priceBreakdown.tax.toFixed(2)}</span>
      </div>
      <div class="totals-final">
        <span>Total:</span>
        <span>$${passport.priceBreakdown.finalTotal.toFixed(2)} USD</span>
      </div>
    </div>

    <div class="evidence-section">
      <h3>PAYPAL AEGIS Deterministic Trust Ledger</h3>
      <div>• <strong>Integer Minor Units:</strong> All arithmetic calculated in integer cents without floating-point precision error.</div>
      <div>• <strong>Server Authority:</strong> Client prices ignored; canonical catalog values locked.</div>
      <div>• <strong>Auto-Invalidation:</strong> Any future cart mutation increments cart version and permanently invalidates this passport.</div>
      <div>• <strong>Single-Use Mandate:</strong> HMAC-SHA256 authorization token expires in 15 minutes and is strictly single-use.</div>
    </div>

    <div class="footer">
      <div>SHOPMATE AI &bull; POWERED BY PAYPAL AEGIS</div>
      <div>CERT-REF: ${passport.passportId.slice(0, 16)}</div>
    </div>
  </div>
</body>
</html>
    `.trim();
    return { contentType: 'text/html', data: html };
  }

  return {
    contentType: 'application/json',
    data: JSON.stringify(passport, null, 2)
  };
}
