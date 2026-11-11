import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { store } from './db/inMemoryStore.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { passportRouter } from './routes/passport.js';
import { paymentsRouter } from './routes/payments.js';
import { missionsRouter } from './routes/missions.js';
import { securityRouter } from './routes/security.js';
import { ordersRouter } from './routes/orders.js';
import { chatRouter } from './routes/chat.js';
import { shoppingRouter } from './routes/shopping.js';
import { dashboardRouter } from './routes/dashboard.js';
import { settingsRouter } from './routes/settings.js';
import { isPayPalConfigured } from './payments/paypalClient.js';
import { connectDB } from './db/connection.js';
import mongoose from 'mongoose';

export const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Permits external demo assets (Unsplash)
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Middleware
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/passport', passportRouter);
app.use('/api/passports', passportRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/security', securityRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/shopping', shoppingRouter);

// Health check & System Diagnostic
app.get('/api/health', (req, res) => {
  const verifiedProducts = store.products.filter(p => !p.isMaliciousSample).length;
  res.json({
    status: 'ONLINE',
    service: 'SHOPMATE AI Platform',
    engine: 'PAYPAL AEGIS (Active)',
    architecture: '4-Layer Coordinated Orchestrator',
    database: {
      connected: mongoose.connection.readyState === 1,
      engine: mongoose.connection.readyState === 1 ? 'MongoDB (Durable Persistence)' : 'In-Memory Store (Dev/Test Fallback)'
    },
    paypalSandbox: {
      configured: isPayPalConfigured(),
      clientIdPresent: !!process.env.PAYPAL_CLIENT_ID,
      environment: 'sandbox'
    },
    llmEngine: {
      configured: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      mode: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY ? 'LIVE_API' : 'OFFLINE_RULE_BASED'
    },
    catalogueStats: {
      verifiedProductsCount: verifiedProducts,
      redTeamQuarantinedAssets: store.products.filter(p => p.isMaliciousSample).length,
      merchantsCount: store.merchants.length
    },
    securityLedger: {
      securityEventsLogged: store.securityEvents.length,
      agentEventsLogged: store.agentEvents.length
    },
    timestamp: new Date().toISOString()
  });
});

// Serve client build in production / single-server deployment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const possibleClientDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../client/dist')
];
const clientDistPath = possibleClientDistPaths.find((p) => fs.existsSync(p));
if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[UNHANDLED_EXCEPTION]', err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message || 'An unexpected error occurred.' });
});

// Start listener only when run directly as the main application process
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await connectDB();
    } catch (dbErr: any) {
      console.warn('[DB_INIT_WARN]', dbErr.message);
    }

    app.listen(PORT, () => {
      console.log('\n===============================================================');
      console.log('🛍️  SHOPMATE AI — Discover Smarter. Shop Better. Stay in Control.');
      console.log('🛡️  PAYPAL AEGIS TRUST & VERIFICATION ENGINE: ONLINE');
      console.log(`🚀  Backend server listening on http://localhost:${PORT}`);
      console.log(`📦  Catalogue: ${store.products.length} products loaded across 9 categories`);
      console.log(`💾  Database: ${mongoose.connection.readyState === 1 ? 'MONGODB CONNECTED (Durable)' : 'LOCAL IN-MEMORY STORE'}`);
      console.log(`💳  PayPal Sandbox: ${isPayPalConfigured() ? 'CONFIGURED (Real Orders v2 Ready)' : 'OFFLINE SIMULATION READY (Add credentials to .env)'}`);
      console.log(`🤖  LLM Mode: ${process.env.GEMINI_API_KEY ? 'GEMINI 1.5 ACTIVE' : 'OFFLINE RULE-BASED MODE (Deterministic)'}`);
      console.log('===============================================================\n');
    });
  })();
}

export default app;
