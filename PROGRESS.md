# SHOPMATE AI — BUILD PROGRESS & VERIFICATION LOG

## Project Summary
- **Product Name**: SHOPMATE AI
- **Powered by**: PAYPAL AEGIS (Trust, Security, and Deterministic Payment-Control Engine)
- **Core Principle**: THE LLM SUGGESTS, DETERMINISTIC BACKEND CODE DECIDES.

---

## Phase Status Summary

| Phase | Description | Status | Verification |
|---|---|---|---|
| **Phase 1** | Setup, Design System, Shared Types, Landing Page | ✅ COMPLETE | Production build passing, clean routing, visual landing page |
| **Phase 2** | Authentication, Dashboard, Navigation, Settings | ✅ COMPLETE | 17/17 Supertest tests passing, Playwright E2E passing, Helmet + Rate limiting active |
| **Phase 3** | Catalogue Discovery, Intent Agent, Workspace Chat | ✅ COMPLETE | 34/34 tests passing (Vitest + Supertest), Playwright E2E passing, SSE streaming live |
| **Phase 4** | Cart Service, Spending Guard, Purchase Passport | ✅ COMPLETE | 52/52 Vitest passing, 3/3 Playwright passing, integer cents math, HMAC-SHA256 mandate, auto-invalidation cascade |
| **Phase 5** | PayPal Sandbox Orders v2 Checkout & Resolution | ⏳ READY | — |
| **Phases 6-10** | Bundle Optimizer, AEGIS Red Team, Full Verification | ⏳ READY | — |

---

## Phase 2 Delivery Details

### 1. Server-Side Authentication & AEGIS DB Initialization
- **Endpoints**:
  - `POST /api/auth/register` (Zod validated, bcrypt password hash with salt rounds = 10, sets httpOnly cookie `shopmate_token`)
  - `POST /api/auth/login` (Zod validated, bcrypt compare, rate-limited)
  - `POST /api/auth/logout` (Clears httpOnly cookie)
  - `GET /api/auth/me` (Protected with `requireAuth`, returns authenticated user profile)
- **Security & Hardening**:
  - `helmet` security headers active
  - In-memory rate limiting on `/api/auth/register` and `/api/auth/login` (blocks rapid spam with HTTP 429)
  - Roles: `user` and `admin` with `requireAuth` and `requireRole` middleware
  - Safe error messages (no email/user existence leaks)
  - Auto-creation of default AEGIS records on user registration:
    - Default Shopping Agent (`status: active`, scoped permissions: `['read_catalogue', 'evaluate_fit', 'prepare_cart', 'request_approval']`)
    - Default Spending Policy (`totalBudget: $2,500`, `maxPricePerItem: $1,500`, `maxCartValue: $2,500`, `maxQuantity: 4`)
    - ShopMate Memory Profile with `personalizationEnabled: false` (OFF by default)
  - Mongoose models created: `User`, `Agent`, `SpendingPolicy`, `MemoryProfile` with indexes and unique email.
  - Dedicated seed script: `server/src/seed/seedUsers.ts` seeding demo (`demo@shopmate.ai` / `DemoPass123!`) and admin (`admin@shopmate.ai` / `AdminPass123!`).

### 2. Client-Side Authentication & Session Flow
- **Login & Register UI** (`/login`):
  - Live tab toggling between Sign In and Create Account
  - One-Click Demo Sign-in for immediate evaluation without typing
  - Real form validation, loading spinner states, and error message banners
- **Auth Context** (`AuthContext.tsx`):
  - Session verification on mount (`/api/auth/me`)
  - `ProtectedRoute` component redirecting unauthenticated users to `/login`
  - Automatic redirect to `/dashboard` upon successful authentication
  - Functional Sign Out button clearing session cookie and context state.

### 3. Comprehensive Dashboard (`/dashboard`)
- Personalized greeting with real user name: *"Welcome back, [Name]"*
- Real-time global search bar routing directly to the AI Workspace
- 8 Data-Backed Sections pulling live from `GET /api/dashboard/summary`:
  1. **Spending Summary Cards**: Total budget ($2,500.00), current cart value, safe remaining budget, total spent, and kill switch status.
  2. **Active Shopping Agents**: Displays real agents from the database with active status pills and scoped permission tags.
  3. **Curated Recommendations**: Verified hardware products with FairPrice verdicts and one-click *Add to Cart* action.
  4. **Saved Products / Bookmarks**: Real-time save/unsave toggle with instant list updates.
  5. **Recent Hardware Missions**: Active missions and budget tracking.
  6. **Pending Passports & Approvals**: Direct inspection links for draft Purchase Passports.
  7. **Recent Orders & Trackers**: Placed orders with return deadlines and warranty dates.
  8. **Security Ledger Alerts**: Real-time feed of intercepted prompt injections and policy checks.

### 4. Navigation & Layout
- Desktop **Sidebar Navigation** and Mobile **Bottom/Drawer Navigation** with active states and cart badges:
  - Dashboard (`/dashboard`)
  - AI Workspace (`/workspace`)
  - Missions (`/missions`)
  - Cart (`/cart`)
  - Passports (`/passport`)
  - Orders & Payments (`/orders`)
  - AEGIS Security Center (`/security`)
  - Settings (`/settings`)
  - Admin Console (`/admin` — visible to administrators only)
- **Theme Toggle**: Light / Dark mode toggle with persistent state saved to `localStorage`.
- **Global Error Boundary**: Catches unexpected rendering exceptions with graceful recovery.
- **404 Page**: Routed on `*` with one-click return to dashboard.

### 5. Settings (`/settings`)
- Profile edit form (updates full name in DB)
- Spending Guard threshold configuration (total budget, max item price, max cart value, co-approval limit)
- ShopMate Memory & Privacy toggle (Enable/Disable assistant cross-session memory)

---

## Phase 3 Delivery Details

### 1. Product Catalogue & Sample Merchants
- **Mongoose Models**:
  - `Product`: text index on `title`, `name`, `description`; indexes on `category`, `brand`, `price`.
  - `Merchant`: indexes on `id`, `name`.
  - `Conversation`: indexes on `conversationId`, `userId`.
- **Catalogue Dataset** (`sampleCatalogue.ts`):
  - 70 products across 9 categories (laptops, smartphones, headphones, monitors, keyboards, mice, gaming accessories, cameras, smart home).
  - 6 sample merchants with different trust scores and policy clarity (`NovaTech`, `Apex Gaming`, `Studio Audio Direct`, `Global Refurb & Surplus Outlet`, `SoundCraft Audio Boutique`, `Direct Liquidators US`).
  - Prominently displays "Sample data" badge on every product card across the application.
  - Exactly ONE product contains an adversarial prompt-injection payload (`prod-malicious-exploit-01`: "StealthOverclock Titanium GPU Adapter"). Flagged in the seed as a security test fixture and searchable like any product.
- **Idempotent Seed Script** (`npm run seed:catalogue`):
  - Upserts into both in-memory store and MongoDB without duplicates. Verified running twice yields exactly 70 products and 6 merchants.

### 2. Deterministic Discovery Service
- Implemented in `server/src/services/discovery.ts` (0% LLM arithmetic/guessing).
- Filters:
  - Free-text query matching across title, brand, description, and specs.
  - Category / categories array.
  - Price bounds (`minPrice`, `maxPrice`).
  - Brand inclusion (`brandsInclude`) and exclusion (`brandsExclude`).
  - Spec constraints (e.g. `ram >= 16`, `storage >= 1000` via `parseNumericSpec`).
  - Stock availability and sorting (`relevance`, `price_asc`, `price_desc`, `rating`).
- Wrapped by authenticated endpoint: `POST /api/shopping/search`.

### 3. Intent Agent & Offline Rule-Based Engine
- Provider abstraction supporting Gemini 1.5 Flash and OpenAI GPT-4o-mini with structured output validated via Zod schema (`IntentOutputSchema`).
- Robust fallback to deterministic offline rule-based parser when API keys are absent:
  - Transparent mode badge: "Offline rule-based mode" or "AI agent mode (OpenAI/Gemini)".
  - Extracts categories, budget, specs (RAM, Storage, GPU, Screen, ANC, Wireless), and brand inclusion/exclusion.
  - Merges follow-up queries with existing requirements without restarting:
    - *"make it cheaper"* -> reduces budget by 20%.
    - *"exclude Dell"* -> appends Dell to `brandsExclude`.
    - *"make it 32GB"* -> updates `specs.ram = 32`.
  - Asks at most one clarifying question only when essential info is missing from vague inputs.

### 4. AEGIS Orchestrator & Choke Point Tool Gateway
- Choke point execution via `AegisToolGateway`:
  - Verifies agent status is active and spending kill switch is disarmed.
  - Emits immutable `IAgentEvent` records to the audit ledger.
  - Quarantines product text within `<UNTRUSTED_MERCHANT_DATA>` isolation tags.
  - Scans for prompt injection attacks (`detectInjection`); logs `ISecurityEvent` with `eventType: 'PROMPT_INJECTION_DETECTED'` and neutralizes the payload so it cannot execute tools or alter agent instructions.
  - The adversarial test fixture (`prod-malicious-exploit-01`) is searchable and displayed with a clear red team quarantine warning tag.

### 5. Server-Sent Events (SSE) Streaming Chat
- Endpoint: `POST /api/shopping/chat` (Zod-validated, auth-required, rate-limited).
- Streams live progress tokens and structured events:
  - `agent_status` ("analyzing_intent", "searching_catalogue", "verifying_specs")
  - `requirements_updated`
  - `token` (word-by-word streaming text chunks)
  - `products` (cards to render)
  - `done`
- Persistent conversation storage:
  - `GET /api/shopping/conversations` (user-scoped)
  - `GET /api/shopping/conversations/:id` (user-scoped with 404 for unauthorized access)
  - `DELETE /api/shopping/conversations/:id`
  - `PATCH /api/shopping/conversations/:id/requirements`

### 6. AI Workspace UI (`WorkspacePage.tsx`)
- 3-column responsive layout:
  - **Left column**: Conversation history list, "New Shopping Mission" button, suggested prompt starters.
  - **Center column**: Streaming chat area with message bubbles, agent thinking indicator, rendered product cards with "Sample data" badge, image, price, specs, merchant trust badge, warranty, return policy, and 4 required card actions:
    1. *Add to Cart* (disabled with tooltip: "Available in Phase 4 Cart Service")
    2. *Compare* (select up to 3 with side-by-side comparison drawer)
    3. *Explain* (disabled with tooltip: "Available in Phase 6 Evidence Explanations")
    4. *Find alternative* (sends one-click follow-up query to the agent)
  - **Right column**: "Understood Requirements" (budget slider, category chips, brand include/exclude tags, spec tags) with an "Apply & Re-search" button that updates conversation requirements and updates product cards without clearing chat; budget utilization meter; live AEGIS Agent Activity Feed.
- URL query parameter reading: `?q=...` from the Dashboard search bar immediately executes the query.

### 7. Verification & Automated Test Results
- **Vitest Unit & Integration Suites**: **34/34 passing** (100% pass rate):
  - `src/tests/discovery.test.ts` (8/8 passed)
  - `src/tests/intent.test.ts` (7/7 passed)
  - `src/tests/securityContainment.test.ts` (3/3 passed)
  - `src/tests/shoppingApi.test.ts` (9/9 passed)
  - `src/tests/auth.test.ts` (7/7 passed)
- **Supertest Assertion Suite** (`runAuthSupertest.ts`): **17/17 passed**.
- **Playwright End-to-End User Journeys**: **2/2 passed** (9.3s total):
  - `tests/auth-journey.spec.ts` (passed)
  - `tests/phase3-workspace.spec.ts` (passed)

---

## Phase 4 Delivery Details

### 1. Deterministic Cart Service
- **Model**: `Cart` (`cartId`, `userId`, `version`, `items` with product snapshots, `subtotal`, `discount`, `shipping`, `tax`, `total`, `currency`, `updatedAt`).
- **Endpoints**:
  - `GET /api/cart` (Returns current user cart and policy summary)
  - `POST /api/cart/items` (Add product; client-submitted prices are ignored; prices loaded authoritatively from DB)
  - `PATCH /api/cart/items/:id` (Update quantity; recomputes totals and validates stock)
  - `DELETE /api/cart/items/:id` (Remove item; increments `cart.version`)
  - `DELETE /api/cart` (Clears cart; increments `cart.version`)
  - Backward-compatible aliases: `POST /api/cart/add`, `POST /api/cart/update`, `POST /api/cart/remove`.
- **Integer Cents Precision**:
  - `computeCartTotals` uses integer minor units (cents) for subtotal, discount, shipping ($9.99 flat, free over $100), and 8% tax (`Math.round(taxableSubtotalCents * 8 / 100)`).
  - Floating-point arithmetic errors (such as `109.92000000000002`) are eliminated.
- **Server-Authoritative Pricing**:
  - If a client injects forged prices (e.g. `{ unitPrice: 1.0, total: 1.0 }`), the server retrieves canonical catalog data and overwrites client input.
- **Auto-Versioning & Invalidation**:
  - Every cart mutation increments `cart.version` and automatically triggers `invalidateCartPassportsAndApprovals(userId, ...)`.

### 2. AEGIS Spending Guard
- **Pure Function**: `spendingGuard.validate(cart, policy)` returning `{ allowed: boolean, violations: string[], suggestedFixes: string[] }`.
- **Policy Enforcement**:
  - `killSwitchActive`: Immediate operational lockdown.
  - `totalBudget` / `maxCartValue`: Cart total ceiling check.
  - `maxPricePerItem`: Single-item cost ceiling.
  - `maxQuantityPerItem`: Anti-hoarding limit.
  - `restrictedCategories`: Hard block on prohibited merchandise.
  - `allowedCategories`: Whitelist constraint.
  - `approvedMerchants`: Restricts unvetted vendors.
- **Actionable Remediation**:
  - Blocked attempts generate plain-language explanations with actionable suggested fixes (e.g. *"Cart would be $650, limit is $500. Remove X or swap to Y to save $160"*).
  - Emits immutable `ISecurityEvent` (`BUDGET_LIMIT_BREACH`) and `IAgentEvent` records for every blocked mutation.
- **Frontend Interception Alert**:
  - Workspace displays a clear dismissible alert modal with specific violations and suggested fixes when a mutation is blocked, preventing silent failures.

### 3. Purchase Passport
- **Model**: `PurchasePassport` (`passportId`, `version`, `userId`, `cartId`, `cartVersion`, `items`, `missionGoal`, `priceBreakdown`, `budgetComparison`, `fitCheckSummary`, `trustScoreOverall`, `riskAssessment`, `approvalStatus`, `invalidationReason`, `createdAt`, `expiresAt`).
- **Status Lifecycle**: `draft` -> `pending_approval` -> `approved` -> `invalidated` / `rejected` / `expired` / `consumed`.
- **Endpoints**:
  - `POST /api/passports` (Generates pre-checkout passport snapshot locked to current `cart.version`)
  - `GET /api/passports/:id` (User-scoped passport retrieval)
  - `POST /api/passports/:id/approve` (Issues Signed Approval Mandate)
  - `POST /api/passports/:id/reject` (Explicit shopper rejection)
  - `GET /api/passports/:id/export?format=html|json` (Printable audit certificate or raw JSON)
  - `GET /api/passports/:id/mandate` (Retrieves active mandate details)
- **UI Presentation** (`/passport?id=...`):
  - Displays locked product snapshots with merchant details, warranties, and return windows.
  - Authoritative financial breakdown with prominent exact total (`$XX.XX USD`).
  - Transparent badges for Trust Score and Risk Assessment honestly labelled *"Coming in Phase 7"*.
  - Action toolbar: Review, Edit Cart, Reject, Approve, Export.

### 4. Signed Approval Mandate (HMAC-SHA256)
- **Model**: `Approval` (`approvalId`, `userId`, `cartId`, `cartVersion`, `orderFingerprint`, `amount`, `currency`, `status`, `expiresAt`, `usedAt`, `approvedAt`).
- **Canonical Fingerprint Calculation**:
  - Root object keys sorted deterministically: `cartId`, `cartVersion`, `currency`, `items`, `merchants`, `totalCents`, `userId`.
  - Child items sorted by `productId`; merchants sorted alphabetically.
  - Signed with `APPROVAL_SECRET` using `HMAC-SHA256`.
- **Mandate Issuance & Verification**:
  - Re-evaluates Spending Guard against live database records before signing.
  - Enforces 15-minute Time-To-Live (`expiresAt: now + 15m`).
  - Single-use guarantee (`status: 'used'`).
  - `verifyMandate(approvalId, currentCart)` verifies the mandate using `crypto.timingSafeEqual` to prevent timing attacks. Rejects on cart tampering, version mismatches, expiry, or reuse.

### 5. Automatic Invalidation Cascade
- Any modification to cart items, quantities, or removals immediately invalidates all prior unconsumed Purchase Passports and Approvals for that user.
- Sets `approvalStatus = 'invalidated'` with explicit reason: *"Cart contents modified after passport generation (cart version incremented from X to Y)"*.
- Invalidation alert banner displayed on `/passport` with direct options to review cart or generate a new passport.

### 6. Verification & Automated Test Results
- **Vitest Unit & Supertest Suites**: **52/52 tests passing** (100% pass rate across 7 test suites):
  - `src/tests/cartSpendingPassport.test.ts` (9/9 passed — integer cents arithmetic, spending guard rules, canonical fingerprint determinism, verifyMandate tamper detection)
  - `src/tests/cartPassportSupertest.test.ts` (9/9 passed — user scoping, forged price rejection, spending guard blocks, post-approval cart modification invalidation)
  - `src/tests/auth.test.ts` (7/7 passed)
  - `src/tests/shoppingApi.test.ts` (9/9 passed)
  - `src/tests/securityContainment.test.ts` (3/3 passed)
  - `src/tests/intent.test.ts` (7/7 passed)
  - `src/tests/discovery.test.ts` (8/8 passed)
- **Playwright End-to-End User Journeys**: **3/3 passed** (11.0s total):
  - `tests/auth-journey.spec.ts` (passed)
  - `tests/phase3-workspace.spec.ts` (passed)
  - `tests/phase4-cart-passport.spec.ts` (passed: Add product -> generate passport -> approve mandate -> modify cart -> passport shows invalidated)
- **TypeScript Builds**: Both frontend (`tsc && vite build`) and backend (`tsc`) compile with 0 errors.



