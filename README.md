# SHOPMATE AI — Discover Smarter. Shop Better. Stay in Control.
> **Powered by PAYPAL AEGIS** (Internal Trust, Security, and Deterministic Payment-Control Engine)

An advanced agentic commerce platform where AI agents research, compare, bundle, and prepare hardware purchases, while deterministic backend code and **PayPal Sandbox Orders v2 REST API** enforce approvals, spending limits, and payment capture.

---

## 🏛️ Core Design Law
> **"THE LLM SUGGESTS, DETERMINISTIC BACKEND CODE DECIDES."**
> The AI model never does arithmetic, enforces spending limits, signs authorization tokens, or captures PayPal payments. All financial math and policy gates run in deterministic TypeScript with zero hallucination risk.

---

## 🌟 Key Features

### 1. 4-Layer Coordinated Architecture
- **BUYWISE**: Shopping intelligence, intent parsing, evidence-based recommendations, and trade-off explanations.
- **PAYPAL AEGIS**: Cryptographic signed approval mandates, deterministic spending guards, heuristic risk scoring, prompt injection defense, and immutable activity ledger.
- **COMMERCE ENGINE**: Server-authoritative cart calculations, coupon validation, inventory snapshots, and PayPal Sandbox Orders v2 REST integration.
- **CUSTOMER EXPERIENCE**: Conversational AI shopping workspace, editable Understood Requirements panel, Mission Bundle Optimizer, Purchase Passport, and post-purchase Resolve Agent.

### 2. P0-1: Mission-Based Shopping & Bundle Optimizer
- Users specify high-level goals (*"AI development workstation under $1,500"*).
- The constraint solver calculates **three distinct architecture plans**:
  1. **Budget Optimized Plan**: Maximum savings while satisfying baseline hardware requirements.
  2. **Best Overall Value Plan (Architect Recommended)**: Sweet spot of compute power, display fidelity, and ergonomics.
  3. **Peak Performance Enthusiast Station**: Top-tier components utilizing maximum budget safely.
- One-click loading of complete verified bundles directly into the shopping cart.

### 3. P0-3: Purchase Passport (Signature Asset)
- Pre-checkout transaction transparency document.
- Locks product snapshots, prices, merchant trust ratings, and return windows.
- Embedded **FitCheck Matrix**: Rule-based verification of USB-C Power Delivery wattage, DisplayPort alt-mode, and OS compatibility.
- Embedded **FairPrice Heuristics**: Historical price comparisons and true discount verification.
- Pre-computes an explainable heuristic risk score (LOW, MEDIUM, HIGH) with co-approver requirements.

### 4. P0-4: HMAC-SHA256 Signed Approval Mandate
- Single-use, time-bound (15-minute TTL) cryptographic authorization token.
- Hashes canonical sorted JSON fields with server secret (`HMAC_SECRET`).
- Verifies cart version match: modifying cart after signing immediately invalidates the mandate, preventing cart tampering and price-spoofing attacks.

### 5. P0-5: Official PayPal Orders v2 REST Checkout & Webhook Security
- Integrates with official **PayPal Orders v2 REST API** (`/v2/checkout/orders` and `/v2/checkout/orders/{id}/capture`).
- Server-authoritative capture verification checklist:
  - User ownership verification
  - Invalidation check & 15-minute TTL enforcement
  - Cart version and canonical HMAC-SHA256 fingerprint validation
  - Real-time Spending Guard re-evaluation
  - Order amount and currency verification against PayPal REST API
- Idempotency key bound to the approval mandate ID (`PayPal-Request-Id`).
- Single-use enforcement guarantees no duplicate payment capture or replay attacks.
- Missing credentials cleanly produce `PAYPAL_NOT_CONFIGURED` without fake captures or orders.
- Official Webhook Signature Verification (`POST /v1/notifications/verify-webhook-signature`) with durable deduplication and idempotency for `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, and `PAYMENT.CAPTURE.REVERSED`.
- See setup guide in `docs/paypal-webhook-setup.md`.

### 6. P0-6: AEGIS Security Center & 7-Vector Red Team Arena
- **Emergency Kill Switch**: Immediate halt of all purchasing, passport generation, and payment orders.
- **Live Red Team Attack Arena**: Run 7 real adversarial attack scenarios:
  1. Poisoned product prompt injection (`POISONED_PRODUCT`)
  2. Budget limit bypass (`BUDGET_BYPASS`)
  3. Forged frontend price spoof (`FORGED_AMOUNT`)
  4. Post-approval cart mutation (`CART_TAMPER`)
  5. Expired approval mandate replay (`EXPIRED_MANDATE`)
  6. Duplicate payment capture replay (`REPLAY_CAPTURE`)
  7. Operational lockdown under kill switch (`KILL_SWITCH`)
- **Immutable Security Events Ledger**: Comprehensive audit trail of all security intercepts.

### 7. Signature USPs
- **Evidence-Linked Shopping**: Every recommendation references actual product catalogue specs; unsupported claims are labeled unknown.
- **Second Opinion & Regret Shield**: Recommends cheaper sufficient alternatives and highlights unneeded premium specs or weak return policies.
- **Co-Approver Passport**: Generates 30-day read-only shareable review links with designated secondary authorization before payment.
- **Agent Flight Recorder**: Ordered 8-step timeline tracing intent extraction, discovery, FitCheck, FairPrice, Spending Guard, passport compilation, mandate signing, and PayPal execution.
- **Post-Purchase Resolve Agent**: Live tracking of 30-day merchant return protection windows and 12-to-36-month hardware warranties.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ / 20+
- npm

### 1. Clone & Install
```bash
git clone https://github.com/your-username/shopmate-ai.git
cd shopmate-ai

# Install server and client dependencies
npm run install:all
```

### 2. Configure Environment (Optional for Sandbox)
Copy `.env.example` to `server/.env`:
```env
PORT=5000
JWT_SECRET=shopmate_dev_jwt_secret_change_in_prod_2026_paypal_aegis
HMAC_SECRET=shopmate_dev_hmac_secret_fingerprint_secure_key
OPENAI_API_KEY=optional_openai_key
GEMINI_API_KEY=optional_gemini_key
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```
*Note: If PayPal or LLM keys are omitted, SHOPMATE AI automatically runs in its deterministic **Offline Rule-Based Mode** and **Sandbox Simulation Mode**, allowing full end-to-end evaluation without third-party credentials.*

### 3. Run Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Client (Port 3000)
npm run dev:client
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Comprehensive Automated Tests
```bash
# Vitest Integration Suite (77 tests across 9 suites)
npm run test

# Deterministic Unit Assertions (24 tests)
npx tsx server/src/tests/runAllTests.ts

# Supertest Auth & Rate Limiting (17 tests)
npx tsx server/src/tests/runAuthSupertest.ts
```

### 5. Production Build & Deployment

#### Option A: Unified Local / Single-Server Build
```bash
# Build both frontend and backend
npm run build

# Start production server on port 5000 (serves API and compiled frontend assets)
npm run start
```

#### Option B: Docker Compose Deployment
```bash
# Spin up production container alongside persistent MongoDB 7.0 database
docker compose up --build -d
```
Access the complete application at `http://localhost:5000`.

---

## 🧪 Demo Credentials & User Roles
- **Shopper Demo**: `demo@shopmate.ai` / `DemoPass123!` (or click *"One-Click Demo Sign-in"*)
- **Admin Demo**: Switch role anytime via the top navigation bar toggle (*"SWITCH TO ADMIN"*).

---

## 📜 Disclaimer
*SHOPMATE AI is an independent product prototype developed for evaluation. It is not an official PayPal product, nor is it endorsed or sponsored by PayPal, Inc. All merchant and price history data are simulated sample assets.*

