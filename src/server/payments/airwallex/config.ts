import 'server-only';

import type { PaymentDiagnostics } from '@/lib/site-settings';
import { resolvePaymentSandboxMode } from '@/server/payments/payment-mode';

export type AirwallexRuntimeConfig = {
  clientId: string;
  apiKey: string;
  apiBase: string;
  env: 'demo' | 'prod';
  sandbox: boolean;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || null;
}

function warnDeprecatedEnvUsage(name: string, replacement: string) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  console.warn(`[payments] ${name} is deprecated; use ${replacement} instead.`);
}

function resolveAirwallexCredentials(sandbox: boolean) {
  if (sandbox) {
    const clientId = readEnv('AIRWALLEX_SANDBOX_CLIENT_ID') ?? readEnv('AIRWALLEX_CLIENT_ID');
    const apiKey = readEnv('AIRWALLEX_SANDBOX_API_KEY') ?? readEnv('AIRWALLEX_API_KEY');
    if (!readEnv('AIRWALLEX_SANDBOX_CLIENT_ID') && readEnv('AIRWALLEX_CLIENT_ID')) {
      warnDeprecatedEnvUsage('AIRWALLEX_CLIENT_ID', 'AIRWALLEX_SANDBOX_CLIENT_ID');
    }
    if (!readEnv('AIRWALLEX_SANDBOX_API_KEY') && readEnv('AIRWALLEX_API_KEY')) {
      warnDeprecatedEnvUsage('AIRWALLEX_API_KEY', 'AIRWALLEX_SANDBOX_API_KEY');
    }
    return { clientId, apiKey };
  }

  return {
    clientId: readEnv('AIRWALLEX_LIVE_CLIENT_ID'),
    apiKey: readEnv('AIRWALLEX_LIVE_API_KEY'),
  };
}

function resolveAirwallexApiBase(sandbox: boolean) {
  if (sandbox) {
    return 'https://api-demo.airwallex.com';
  }
  return 'https://api.airwallex.com';
}

export async function getAirwallexConfig(): Promise<AirwallexRuntimeConfig | null> {
  const sandbox = await resolvePaymentSandboxMode();
  const { clientId, apiKey } = resolveAirwallexCredentials(sandbox);

  if (!clientId || !apiKey) {
    return null;
  }

  return {
    clientId,
    apiKey,
    apiBase: resolveAirwallexApiBase(sandbox),
    env: sandbox ? 'demo' : 'prod',
    sandbox,
  };
}

export async function isAirwallexConfigured() {
  return Boolean(await getAirwallexConfig());
}

export function isAirwallexEnvConfigured(sandbox: boolean) {
  const { clientId, apiKey } = resolveAirwallexCredentials(sandbox);
  return Boolean(clientId && apiKey);
}

export async function buildAirwallexPaymentDiagnostics(): Promise<PaymentDiagnostics['airwallex']> {
  const sandbox = await resolvePaymentSandboxMode();
  return { configured: isAirwallexEnvConfigured(sandbox) };
}
