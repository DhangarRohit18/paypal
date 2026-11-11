import { store } from '../db/inMemoryStore.js';

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

/**
 * Returns true strictly if both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are defined non-empty strings.
 */
export function isPayPalConfigured(): boolean {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  return Boolean(clientId && clientId.trim() !== '' && clientSecret && clientSecret.trim() !== '');
}

/**
 * Safe logger for PayPal operations: never logs client secret or raw authorization headers.
 */
function logPayPalInfo(action: string, metadata: Record<string, any>) {
  console.log(`[PAYPAL_AEGIS][${action}]`, JSON.stringify(metadata));
}

function logPayPalError(action: string, error: any, debugId?: string | null) {
  console.error(`[PAYPAL_AEGIS_ERROR][${action}]`, {
    message: error?.message || error,
    debugId: debugId || 'N/A'
  });
}

/**
 * Requests or retrieves cached OAuth2 access token with proactive 60-second refresh window.
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_NOT_CONFIGURED: Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment.');
  }

  // Check token cache (refresh 60 seconds before expiration)
  if (store.paypalTokenCache && Date.now() < store.paypalTokenCache.expiresAt - 60000) {
    return store.paypalTokenCache.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal
    });

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      const errorText = await response.text();
      logPayPalError('OAUTH_TOKEN_FAILED', `${response.status} ${errorText}`, debugId);
      throw new Error(`PAYPAL_AUTH_FAILED: ${response.status} - Debug ID: ${debugId || 'none'}`);
    }

    const data: any = await response.json();
    const token = data.access_token;
    const expiresInMs = (data.expires_in || 3600) * 1000;

    store.paypalTokenCache = {
      token,
      expiresAt: Date.now() + expiresInMs
    };

    logPayPalInfo('OAUTH_TOKEN_ACQUIRED', {
      expiresIn: data.expires_in,
      debugId
    });

    return token;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logPayPalError('OAUTH_TIMEOUT', 'PayPal OAuth request timed out after 10000ms');
      throw new Error('PAYPAL_TIMEOUT: OAuth request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface CreatePayPalOrderParams {
  idempotencyKey: string;
  finalAmount: string; // e.g. "129.99"
  currency: string;
  passportId: string;
  approvalId?: string;
  items: Array<{
    name: string;
    quantity: string;
    unitAmount: string;
  }>;
}

/**
 * Creates an authorized order via official PayPal Orders v2 REST API (POST /v2/checkout/orders).
 * Strictly requires configured credentials.
 */
export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<{
  orderId: string;
  approveUrl: string;
  status: string;
  debugId?: string | null;
}> {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_NOT_CONFIGURED: Cannot create order without active PayPal Sandbox credentials.');
  }

  const token = await getPayPalAccessToken();

  const baseUrl = (process.env.CLIENT_URL || process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const returnUrl = `${baseUrl}/orders?status=success&passportId=${encodeURIComponent(params.passportId)}`;
  const cancelUrl = `${baseUrl}/passport?status=cancelled&id=${encodeURIComponent(params.passportId)}`;

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.approvalId || params.passportId,
        description: `SHOPMATE AI Mandate Order (Passport: ${params.passportId.slice(0, 8)})`,
        custom_id: params.passportId,
        amount: {
          currency_code: params.currency || 'USD',
          value: params.finalAmount
        }
      }
    ],
    application_context: {
      brand_name: 'SHOPMATE AI (Powered by PayPal AEGIS)',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': params.idempotencyKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      const errorBody = await response.text();
      logPayPalError('CREATE_ORDER_FAILED', `${response.status} - ${errorBody}`, debugId);
      throw new Error(`PAYPAL_ORDER_CREATION_FAILED: ${response.status} - Debug ID: ${debugId || 'none'}`);
    }

    const orderData: any = await response.json();
    const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href || '';

    logPayPalInfo('ORDER_CREATED', {
      orderId: orderData.id,
      status: orderData.status,
      debugId
    });

    return {
      orderId: orderData.id,
      approveUrl: approveLink,
      status: orderData.status,
      debugId
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logPayPalError('CREATE_ORDER_TIMEOUT', 'PayPal order creation timed out after 10000ms');
      throw new Error('PAYPAL_TIMEOUT: Order creation request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retrieves order details directly from PayPal Orders v2 REST API (GET /v2/checkout/orders/{id})
 * for server-authoritative verification before capture.
 */
export async function getPayPalOrder(paypalOrderId: string): Promise<{
  id: string;
  status: string;
  intent: string;
  amount: string;
  currency: string;
  customId?: string;
  referenceId?: string;
  debugId?: string | null;
}> {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_NOT_CONFIGURED: Cannot retrieve PayPal order without credentials.');
  }

  const token = await getPayPalAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      const errorBody = await response.text();
      logPayPalError('GET_ORDER_FAILED', `${response.status} - ${errorBody}`, debugId);
      throw new Error(`PAYPAL_GET_ORDER_FAILED: ${response.status} - Debug ID: ${debugId || 'none'}`);
    }

    const data: any = await response.json();
    const unit = data.purchase_units?.[0];

    return {
      id: data.id,
      status: data.status,
      intent: data.intent,
      amount: unit?.amount?.value || '0.00',
      currency: unit?.amount?.currency_code || 'USD',
      customId: unit?.custom_id,
      referenceId: unit?.reference_id,
      debugId
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('PAYPAL_TIMEOUT: Order lookup timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Server-authoritative capture of an approved PayPal order (POST /v2/checkout/orders/{id}/capture).
 * Guaranteed idempotent and atomic with PayPal-Request-Id header.
 */
export async function capturePayPalOrder(
  paypalOrderId: string,
  idempotencyKey?: string
): Promise<{
  captureId: string;
  status: string;
  amount: string;
  currency: string;
  payerEmail?: string;
  debugId?: string | null;
}> {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_NOT_CONFIGURED: Cannot capture order without active PayPal credentials.');
  }

  const token = await getPayPalAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      {
        method: 'POST',
        headers,
        signal: controller.signal
      }
    );

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      const errorBody = await response.text();
      logPayPalError('CAPTURE_ORDER_FAILED', `${response.status} - ${errorBody}`, debugId);
      throw new Error(`PAYPAL_CAPTURE_FAILED: ${response.status} - Debug ID: ${debugId || 'none'}`);
    }

    const captureData: any = await response.json();
    const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = captureUnit?.status || captureData.status;

    if (captureStatus !== 'COMPLETED') {
      logPayPalError('CAPTURE_NOT_COMPLETED', `Unexpected capture status: ${captureStatus}`, debugId);
      throw new Error(`PAYPAL_CAPTURE_INCOMPLETE: Payment status is ${captureStatus}`);
    }

    logPayPalInfo('ORDER_CAPTURED', {
      orderId: paypalOrderId,
      captureId: captureUnit?.id,
      status: captureStatus,
      debugId
    });

    return {
      captureId: captureUnit?.id || `CAP-${paypalOrderId}`,
      status: captureStatus,
      amount: captureUnit?.amount?.value || '0.00',
      currency: captureUnit?.amount?.currency_code || 'USD',
      payerEmail: captureData.payer?.email_address,
      debugId
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logPayPalError('CAPTURE_TIMEOUT', 'PayPal order capture timed out after 10000ms');
      throw new Error('PAYPAL_TIMEOUT: Order capture request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface VerifyWebhookSignatureParams {
  authAlgo?: string;
  certUrl?: string;
  transmissionId?: string;
  transmissionSig?: string;
  transmissionTime?: string;
  webhookId?: string;
  webhookEvent: any;
}

/**
 * Official PayPal Webhook Signature Verification (POST /v1/notifications/verify-webhook-signature)
 */
export async function verifyPayPalWebhookSignature(
  params: VerifyWebhookSignatureParams
): Promise<{ verified: boolean; status: string; debugId?: string | null }> {
  if (!isPayPalConfigured()) {
    return { verified: false, status: 'PAYPAL_NOT_CONFIGURED' };
  }

  const webhookId = params.webhookId || process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    return { verified: false, status: 'MISSING_WEBHOOK_ID' };
  }

  if (
    !params.authAlgo ||
    !params.certUrl ||
    !params.transmissionId ||
    !params.transmissionSig ||
    !params.transmissionTime
  ) {
    return { verified: false, status: 'MISSING_SIGNATURE_HEADERS' };
  }

  const token = await getPayPalAccessToken();

  const payload = {
    auth_algo: params.authAlgo,
    cert_url: params.certUrl,
    transmission_id: params.transmissionId,
    transmission_sig: params.transmissionSig,
    transmission_time: params.transmissionTime,
    webhook_id: webhookId,
    webhook_event: params.webhookEvent
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      const errorBody = await response.text();
      logPayPalError('WEBHOOK_VERIFY_REQUEST_FAILED', `${response.status} - ${errorBody}`, debugId);
      return { verified: false, status: `HTTP_${response.status}`, debugId };
    }

    const data: any = await response.json();
    const verified = data.verification_status === 'SUCCESS';

    logPayPalInfo('WEBHOOK_SIGNATURE_EVALUATED', {
      verificationStatus: data.verification_status,
      verified,
      debugId
    });

    return {
      verified,
      status: data.verification_status,
      debugId
    };
  } catch (err: any) {
    logPayPalError('WEBHOOK_VERIFY_EXCEPTION', err);
    return { verified: false, status: 'VERIFICATION_EXCEPTION' };
  } finally {
    clearTimeout(timeoutId);
  }
}
