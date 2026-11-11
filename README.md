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

### 5. P0-5: Real PayPal Sandbox Orders v2 Checkout
- Integrates with official **PayPal Orders v2 REST API** (`/v2/checkout/orders` and `/v2/checkout/orders/{id}/capture`).
- Idempotency key bound to the approval mandate ID.
- Single-use enforcement guarantees no duplicate payment capture or replay attacks.

### 6. P0-6: AEGIS Security Center & Red Team Mode
- **Emergency Kill Switch**: One-click immediate halt of all purchasing, passport generation, and payment orders.
- **Live Red Team Attack Simulator**: Test 5 real adversarial attack vectors (poisoned product prompt injection, budget limit bypass, post-approval cart tampering, expired mandate replay, forged amount spoofing) and witness real-time AEGIS defense intercepts.
- **Immutable Security Events Ledger**: Comprehensive audit trail of all security actions.

### 7. Post-Purchase Resolve Agent
- Live tracking of 30-day merchant return protection windows and 12-to-36-month hardware warranties.
- Generates official return RMA manifests and manufacturer repair claim guidance.

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

### 4. Run Comprehensive Unit Tests
```bash
npm run test:server
```

---

## 🧪 Demo Credentials & User Roles
- **Shopper Demo**: `demo@shopmate.ai` / `DemoPass123!` (or click *"One-Click Demo Sign-in"*)
- **Admin Demo**: Switch role anytime via the top navigation bar toggle (*"SWITCH TO ADMIN"*).

---

## 📜 Disclaimer
*SHOPMATE AI is an independent product prototype developed for evaluation. It is not an official PayPal product, nor is it endorsed or sponsored by PayPal, Inc. All merchant and price history data are simulated sample assets.*

