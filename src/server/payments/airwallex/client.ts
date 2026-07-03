import 'server-only';

import { getAirwallexConfig } from '@/server/payments/airwallex/config';
import type { AirwallexPaymentIntent, CreatePaymentIntentInput } from '@/server/payments/airwallex/types';

type AuthCache = {
  token: string;
  expiresAtMs: number;
  cacheKey: string;
};

let authCache: AuthCache | null = null;

function clearAuthCache() {
  authCache = null;
}

function buildAuthCacheKey(config: NonNullable<Awaited<ReturnType<typeof getAirwallexConfig>>>) {
  return `${config.apiBase}:${config.clientId}`;
}

type AirwallexErrorPayload = {
  code?: string;
  message?: string;
  source?: string;
};

export class AirwallexApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, payload: AirwallexErrorPayload) {
    super(payload.message || `Airwallex API error (${status})`);
    this.name = 'AirwallexApiError';
    this.status = status;
    this.code = payload.code;
  }
}

async function airwallexFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const config = await getAirwallexConfig();
  if (!config) {
    throw new Error('AIRWALLEX_NOT_CONFIGURED');
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (init.auth !== false) {
    const token = await getAirwallexAccessToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${config.apiBase}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({})) as AirwallexErrorPayload;

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[airwallex] API error', { path, status: response.status, payload });
    }
    throw new AirwallexApiError(response.status, payload);
  }

  return payload as T;
}

export async function getAirwallexAccessToken() {
  const config = await getAirwallexConfig();
  if (!config) {
    throw new Error('AIRWALLEX_NOT_CONFIGURED');
  }

  const cacheKey = buildAuthCacheKey(config);
  const now = Date.now();
  if (authCache && authCache.cacheKey === cacheKey && authCache.expiresAtMs - 60_000 > now) {
    return authCache.token;
  }

  const payload = await airwallexFetch<{ token: string; expires_at?: string }>(
    '/api/v1/authentication/login',
    {
      method: 'POST',
      auth: false,
      headers: {
        'x-client-id': config.clientId,
        'x-api-key': config.apiKey,
      },
    },
  );

  const expiresAtMs = payload.expires_at
    ? Date.parse(payload.expires_at)
    : now + 25 * 60_000;

  authCache = {
    token: payload.token,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : now + 25 * 60_000,
    cacheKey,
  };

  return authCache.token;
}

export async function createAirwallexPaymentIntent(input: CreatePaymentIntentInput) {
  const body: Record<string, unknown> = {
    request_id: input.requestId,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    merchant_order_id: input.merchantOrderId,
  };

  if (input.customerEmail) {
    body.customer = {
      email: input.customerEmail,
    };
  }

  return airwallexFetch<AirwallexPaymentIntent>('/api/v1/pa/payment_intents/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function retrieveAirwallexPaymentIntent(intentId: string) {
  return airwallexFetch<AirwallexPaymentIntent>(`/api/v1/pa/payment_intents/${encodeURIComponent(intentId)}`, {
    method: 'GET',
  });
}

export async function cancelAirwallexPaymentIntent(intentId: string, requestId: string) {
  return airwallexFetch<AirwallexPaymentIntent>(
    `/api/v1/pa/payment_intents/${encodeURIComponent(intentId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    },
  );
}

export async function withAirwallexAuthRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && /unauthorized|401/i.test(error.message)) {
      clearAuthCache();
      return operation();
    }
    throw error;
  }
}
