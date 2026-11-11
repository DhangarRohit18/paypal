import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  generatePassport,
  getPassport,
  rejectPassport,
  exportPassport
} from '../services/passportService.js';
import { approvePassportAndIssueMandate } from '../services/mandateService.js';
import { getOrCreateCart } from '../services/cartService.js';
import { store } from '../db/inMemoryStore.js';

const router = Router();
router.use(requireAuth);

// ----------------------------------------------------------------------------
// POST /api/passports (and POST /api/passport/generate) — Generate Purchase Passport
// ----------------------------------------------------------------------------
const handleGeneratePassport = (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const { missionGoal } = req.body || {};
  const result = generatePassport(userId, missionGoal);

  if (result.error) {
    res.status(400).json({ error: result.error, reasons: result.reasons });
    return;
  }

  res.json({
    success: true,
    passport: result.passport
  });
};

router.post('/', handleGeneratePassport);
router.post('/generate', handleGeneratePassport);

// ----------------------------------------------------------------------------
// GET /api/passports/:passportId — Inspect Purchase Passport
// ----------------------------------------------------------------------------
router.get('/:passportId', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const passport = getPassport(req.params.passportId);
  if (!passport) {
    res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
    return;
  }

  // Strict user scoping
  if (passport.userId !== userId) {
    res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
    return;
  }

  res.json({ success: true, passport });
});

// ----------------------------------------------------------------------------
// POST /api/passports/:passportId/approve — Sign & issue cryptographic Approval Mandate
// ----------------------------------------------------------------------------
router.post('/:passportId/approve', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const passport = getPassport(req.params.passportId);
  if (!passport || passport.userId !== userId) {
    res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
    return;
  }

  const policy = store.getSpendingPolicy(userId);
  if (policy.killSwitchActive) {
    res.status(403).json({
      error: 'KILL_SWITCH_ACTIVE',
      message: 'AEGIS emergency kill switch active. Signing blocked.'
    });
    return;
  }

  const currentCart = getOrCreateCart(userId);

  // Execute approval and issue signed mandate with timing-safe order fingerprint
  const approvalResult = approvePassportAndIssueMandate(passport, currentCart, userId);

  if (!approvalResult.success) {
    res.status(400).json({
      error: approvalResult.error,
      reasons: approvalResult.reasons
    });
    return;
  }

  res.json({
    success: true,
    passport,
    mandate: approvalResult.mandate,
    approval: approvalResult.approval
  });
});

// ----------------------------------------------------------------------------
// POST /api/passports/:passportId/reject — Reject Purchase Passport
// ----------------------------------------------------------------------------
router.post('/:passportId/reject', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const { reason } = req.body || {};
  const result = rejectPassport(req.params.passportId, userId, reason);

  if (!result.success) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    passport: result.passport
  });
});

// ----------------------------------------------------------------------------
// GET /api/passports/:passportId/export — Export passport (JSON or PDF/HTML)
// ----------------------------------------------------------------------------
router.get('/:passportId/export', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const passport = getPassport(req.params.passportId);
  if (!passport || passport.userId !== userId) {
    res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
    return;
  }

  const format = (req.query.format as string) === 'pdf' || (req.query.format as string) === 'html' ? 'html' : 'json';
  const exported = exportPassport(passport, format);

  res.setHeader('Content-Type', exported.contentType);
  res.send(exported.data);
});

// ----------------------------------------------------------------------------
// GET /api/passports/:passportId/mandate — Retrieve issued Approval Mandate
// ----------------------------------------------------------------------------
router.get('/:passportId/mandate', (req: AuthRequest, res: Response) => {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const passport = getPassport(req.params.passportId);
  if (!passport || passport.userId !== userId) {
    res.status(404).json({ error: 'PASSPORT_NOT_FOUND' });
    return;
  }

  const mandate = Array.from(store.approvals.values()).find(
    (m) => m.passportId === passport.passportId
  );

  if (!mandate) {
    res.status(404).json({ error: 'MANDATE_NOT_FOUND' });
    return;
  }

  res.json({ success: true, mandate });
});

export const passportRouter = router;
