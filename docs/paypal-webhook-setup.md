# PayPal Developer Webhook Integration & Tunnel Setup Guide

This guide details how to configure real-time webhook event listening for **SHOPMATE AI** using either **Cloudflare Tunnel** or **ngrok**, and register the webhook with your PayPal Developer Sandbox account.

---

## 1. Overview of Supported Webhook Events

PAYPAL AEGIS listens to and verifies the following critical event types:

| Event Type | AEGIS Security Action |
|---|---|
| `PAYMENT.CAPTURE.COMPLETED` | Marks order as `PROCESSING` / `COMPLETED`, records capture ID |
| `PAYMENT.CAPTURE.DENIED` | Flags order as `CANCELLED`, records security event |
| `PAYMENT.CAPTURE.REFUNDED` | Updates order state to `REFUNDED` |
| `PAYMENT.CAPTURE.REVERSED` | Marks order as `DISPUTED` / `REFUNDED` |

Every webhook transmission is verified using PayPal's official signature verification endpoint (`POST /v1/notifications/verify-webhook-signature`), checked for replay deduplication using a unique event ID, and logged in durable storage.

---

## 2. Exposing Your Local Server to the Internet

PayPal's servers require a publicly accessible HTTPS endpoint to deliver webhooks.

### Option A: Using Cloudflare Tunnel (Recommended — Free & No Session Limit)
```bash
# 1. Install cloudflared (if not already installed)
# Windows via winget:
winget install Cloudflare.cloudflared

# 2. Start a tunnel forwarding to your local server (Port 5000)
cloudflared tunnel --url http://localhost:5000
```
`cloudflared` will print a public URL like:
```
https://random-subdomain.trycloudflare.com
```

### Option B: Using ngrok
```bash
# 1. Start an ngrok tunnel forwarding to port 5000
ngrok http 5000
```
`ngrok` will print a public HTTPS URL like:
```
https://abc123xyz.ngrok-free.app
```

---

## 3. Registering the Webhook in PayPal Developer Dashboard

1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/).
2. Navigate to **Apps & Credentials** and select your Sandbox REST App.
3. Scroll down to the **Webhooks** section and click **Add Webhook**.
4. In the **Webhook URL** field, enter your public tunnel URL with the endpoint:
   ```
   https://<your-tunnel-domain>/api/payments/webhook
   ```
   *(Example: `https://abc123xyz.ngrok-free.app/api/payments/webhook`)*
5. Under **Event Types**, check the following 4 events:
   - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
   - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
   - `Payment capture refunded` (`PAYMENT.CAPTURE.REFUNDED`)
   - `Payment capture reversed` (`PAYMENT.CAPTURE.REVERSED`)
6. Click **Save**.
7. Copy the newly generated **Webhook ID** (format: `WH-XXXXXXXXXXXXXXXXX`).

---

## 4. Configuring Server Environment Variables

Add the Webhook ID to your `server/.env`:
```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=WH-XXXXXXXXXXXXXXXXX
APP_BASE_URL=http://localhost:3000
```

Restart your backend server:
```bash
npm run dev:server
```

---

## 5. Testing the Webhook Integration

### Simulating Webhooks with PayPal Sandbox Event Simulator
1. In the PayPal Developer Dashboard, navigate to **Testing Tools** > **Webhook Simulator**.
2. Select your Webhook URL.
3. Select Event Type: `Payment capture completed`.
4. Click **Send Test**.
5. Observe the live server console:
   ```
   [PAYPAL_WEBHOOK] Received event: PAYMENT.CAPTURE.COMPLETED (ID: ...)
   [PAYPAL_AEGIS][WEBHOOK_SIGNATURE_EVALUATED] {"verificationStatus":"SUCCESS","verified":true}
   ```
6. You can also view historical webhook events by querying:
   ```bash
   GET http://localhost:5000/api/payments/webhooks
   ```

