import { store } from '../db/inMemoryStore.js';

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

export function isPayPalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function getPayPalAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_NOT_CONFIGURED: Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment.');
  }

  // Check token cache
  if (store.paypalTokenCache && Date.now() < store.paypalTokenCache.expiresAt - 60000) {
    return store.paypalTokenCache.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PAYPAL_AUTH_FAILED: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresInMs = (data.expires_in || 3600) * 1000;

  store.paypalTokenCache = {
    token,
    expiresAt: Date.now() + expiresInMs
  };

  return token;
}

export interface CreatePayPalOrderParams {
  idempotencyKey: string;
  finalAmount: string; // e.g. "129.99"
  currency: string;
  passportId: string;
  items: Array<{
    name: string;
    quantity: string;
    unitAmount: string;
  }>;
}

export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<{
  orderId: string;
  approveUrl: string;
  status: string;
}> {
  if (!isPayPalConfigured()) {
    // Return honest simulation / not-configured payload
    return {
      orderId: `SIMULATED-SANDBOX-${Date.now()}`,
      approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=SIMULATED-${params.passportId}`,
      status: 'NOT_CONFIGURED'
    };
  }

  const token = await getPayPalAccessToken();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.passportId,
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
      return_url: 'http://localhost:3000/orders?status=success',
      cancel_url: 'http://localhost:3000/passport?status=cancelled'
    }
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': params.idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PAYPAL_ORDER_CREATION_FAILED: ${response.status} - ${errorBody}`);
  }

  const orderData = await response.json();
  const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href || '';

  return {
    orderId: orderData.id,
    approveUrl: approveLink,
    status: orderData.status
  };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  captureId: string;
  status: string;
  amount: string;
  payerEmail?: string;
}> {
  if (!isPayPalConfigured()) {
    return {
      captureId: `SIM-CAPTURE-${Date.now()}`,
      status: 'COMPLETED',
      amount: '0.00',
      payerEmail: 'sandbox-buyer@shopmate.ai'
    };
  }

  const token = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PAYPAL_CAPTURE_FAILED: ${response.status} - ${errorBody}`);
  }

  const captureData = await response.json();
  const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    captureId: captureUnit?.id || `CAP-${paypalOrderId}`,
    status: captureData.status || 'COMPLETED',
    amount: captureUnit?.amount?.value || '0.00',
    payerEmail: captureData.payer?.email_address
  };
}

