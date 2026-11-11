import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { store, UserRecord } from '../db/inMemoryStore.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { UserModel } from '../models/User.js';
import { AgentModel } from '../models/Agent.js';
import { SpendingPolicyModel } from '../models/SpendingPolicy.js';
import { MemoryProfileModel } from '../models/MemoryProfile.js';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email address').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

function sendAuthCookie(res: Response, user: UserRecord) {
  const secret = process.env.JWT_SECRET || 'shopmate_dev_jwt_secret_change_in_prod_2026_paypal_aegis';
  const token = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('shopmate_token', token, {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists (safe message)
  if (store.getUserByEmail(normalizedEmail)) {
    res.status(409).json({
      error: 'ACCOUNT_EXISTS',
      message: 'An account with this email address already exists. Please log in instead.'
    });
    return;
  }

  // Hash password with bcryptjs (salt rounds = 10)
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `usr-${uuidv4()}`;

  const newUser: UserRecord = {
    userId,
    email: normalizedEmail,
    name: name.trim(),
    role: 'user',
    createdAt: new Date().toISOString(),
    passwordHash
  };

  // 1. Store in in-memory store
  store.users.set(newUser.userId, newUser);

  // 2. Auto-create default AEGIS records:
  // - one default shopping Agent (status: active, scoped permissions)
  // - default spending policy (budget, max item price, max cart value, restricted categories empty, max quantity)
  // - empty ShopMate Memory profile with personalization OFF by default
  store.initUserRecords(newUser.userId);

  // 3. Persist to MongoDB if connected
  try {
    if (UserModel.db?.readyState === 1) {
      await UserModel.create({
        userId: newUser.userId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        passwordHash: newUser.passwordHash,
        createdAt: newUser.createdAt
      });
      const agents = store.getAgentsByUserId(newUser.userId);
      if (agents[0]) {
        await AgentModel.create(agents[0]);
      }
      const policy = store.getSpendingPolicy(newUser.userId);
      await SpendingPolicyModel.create(policy);
      const memory = store.getMemoryProfile(newUser.userId);
      await MemoryProfileModel.create(memory);
    }
  } catch (dbErr) {
    // Non-blocking for in-memory fallback
    console.warn('[MONGO_ASYNC_SYNC_NOTE] In-memory active; Mongoose write deferred:', dbErr);
  }

  sendAuthCookie(res, newUser);

  res.status(201).json({
    user: {
      userId: newUser.userId,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const user = store.getUserByEmail(normalizedEmail);

  if (!user) {
    res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email address or password.'
    });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email address or password.'
    });
    return;
  }

  sendAuthCookie(res, user);

  res.json({
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = store.getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  res.json({
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('shopmate_token', {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

export const authRouter = router;
