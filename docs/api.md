# SHOPMATE AI & PAYPAL AEGIS — REST API REFERENCE

All backend endpoints are prefixed with `/api`. Authenticated routes use secure, httpOnly session cookies (`shopmate_token`).

---

## 1. Authentication (`/api/auth`)
- `POST /register`: Registers new user (`{ name, email, password }`).
- `POST /login`: Authenticates credentials and sets secure cookie.
- `GET /me`: Returns currently authenticated user record.
- `POST /logout`: Clears session cookie.

---

## 2. Product Discovery (`/api/products`)
- `GET /`: Search and filter catalogue (`?q=...&category=...&minPrice=...&maxPrice=...&brand=...&sortBy=...&limit=...`).
- `GET /categories`: Returns distinct list of 9 hardware categories.
- `GET /:id`: Retrieves single product details with FairPrice and FitCheck evaluations.
- `POST /search`: Advanced JSON filter query.

---

## 3. Shopping Cart (`/api/cart`)
- `GET /`: Retrieves authoritative cart, second opinion report, and spending guard status.
- `POST /add`: Adds item with quantity (`{ productId, quantity }`).
- `POST /update`: Updates item quantity (`{ productId, quantity }`).
- `POST /remove`: Removes item from cart (`{ productId }`).
- `DELETE /`: Clears active cart.

---

## 4. Purchase Passport & Mandates (`/api/passport`)
- `POST /generate`: Creates tamper-evident Purchase Passport from current cart snapshot.
- `GET /:passportId`: Retrieves passport document.
- `POST /:passportId/approve`: Signs HMAC-SHA256 Approval Mandate.
- `GET /:passportId/mandate`: Retrieves signed mandate details.

---

## 5. Payments & PayPal Orders v2 (`/api/payments`)
- `GET /config`: Checks PayPal Sandbox environment status.
- `POST /create-order`: Validates mandate and creates PayPal order (`{ passportId, approvalId }`).
- `POST /capture-order`: Captures PayPal payment, marks mandate as used, clears cart, and creates order (`{ paypalOrderId, approvalId }`).
- `POST /webhook`: Ingestion point for asynchronous PayPal webhook notifications.

---

## 6. Missions & Optimizer (`/api/missions`)
- `GET /presets`: Returns curated mission presets.
- `POST /create`: Solves knapsack constraints and produces 3 distinct bundle plans (`{ goal, targetBudget }`).
- `GET /:id`: Retrieves mission plans.
- `POST /:id/select-plan`: Populates cart with selected plan's items.

---

## 7. AEGIS Security & Red Team (`/api/security`)
- `GET /events`: Retrieves immutable security events ledger.
- `GET /agent-events`: Retrieves tool execution audit trace.
- `GET /policy`: Returns active spending policy.
- `PUT /policy`: Updates spending limits and restricted categories.
- `POST /kill-switch`: Toggles emergency kill switch (`{ active: boolean }`).
- `POST /red-team/simulate`: Executes adversarial test attack scenario (`{ scenarioId }`).

---

## 8. Orders & Resolutions (`/api/orders`)
- `GET /`: Lists all placed orders with return and warranty dates.
- `GET /:id`: Retrieves order details.
- `POST /:id/resolution`: Drafts official return RMA or warranty claim (`{ requestType, reason }`).

---

## 9. System Diagnostics (`/api/health`)
- `GET /`: Comprehensive platform health, engine status, and catalogue statistics.

