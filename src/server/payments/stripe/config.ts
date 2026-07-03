import 'server-only';

import type { PaymentDiagnostics } from '@/lib/site-settings';
import { resolvePaymentSandboxMode } from '@/server/payments/payment-mode';

export type StripeConfig = {
  secretKey: string;
  publicKey: string;
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

function resolveStripeKeys(sandbox: boolean) {
  if (sandbox) {
    const secretKey = readEnv('STRIPE_SANDBOX_SECRET_KEY') ?? readEnv('STRIPE_SECRET_KEY');
    const publicKey = readEnv('STRIPE_SANDBOX_PUBLIC_KEY') ?? readEnv('STRIPE_PUBLIC_KEY');
    if (!readEnv('STRIPE_SANDBOX_SECRET_KEY') && readEnv('STRIPE_SECRET_KEY')) {
      warnDeprecatedEnvUsage('STRIPE_SECRET_KEY', 'STRIPE_SANDBOX_SECRET_KEY');
    }
    if (!readEnv('STRIPE_SANDBOX_PUBLIC_KEY') && readEnv('STRIPE_PUBLIC_KEY')) {
      warnDeprecatedEnvUsage('STRIPE_PUBLIC_KEY', 'STRIPE_SANDBOX_PUBLIC_KEY');
    }
    return { secretKey, publicKey };
  }

  const secretKey = readEnv('STRIPE_LIVE_SECRET_KEY');
  const publicKey = readEnv('STRIPE_LIVE_PUBLIC_KEY');
  return { secretKey, publicKey };
}

function warnStripeKeyMismatch(sandbox: boolean, secretKey: string, publicKey: string) {
  const secretLooksLive = secretKey.startsWith('sk_live_');
  const publicLooksLive = publicKey.startsWith('pk_live_');
  if (sandbox && (secretLooksLive || publicLooksLive)) {
    console.warn('[payments] payment sandbox mode is ON but Stripe keys look like live keys.');
  }
  if (!sandbox && (!secretLooksLive || !publicLooksLive)) {
    console.warn('[payments] payment sandbox mode is OFF but Stripe keys do not look like live keys.');
  }
}

export async function getStripeConfig(): Promise<StripeConfig | null> {
  const sandbox = await resolvePaymentSandboxMode();
  const { secretKey, publicKey } = resolveStripeKeys(sandbox);

  if (!secretKey || !publicKey) {
    return null;
  }

  warnStripeKeyMismatch(sandbox, secretKey, publicKey);

  return { secretKey, publicKey, sandbox };
}

export async function isStripeConfigured() {
  return Boolean(await getStripeConfig());
}

export function resolveStripePublicKeyMode(publicKey: string): 'test' | 'live' {
  return publicKey.startsWith('pk_live_') ? 'live' : 'test';
}

export async function resolveStripeModeFromConfig(): Promise<'test' | 'live' | null> {
  const config = await getStripeConfig();
  if (!config) {
    return null;
  }
  return config.sandbox ? 'test' : 'live';
}

export function isStripeEnvConfigured(sandbox: boolean) {
  const { secretKey, publicKey } = resolveStripeKeys(sandbox);
  return Boolean(secretKey && publicKey);
}

export async function buildStripePaymentDiagnostics(): Promise<PaymentDiagnostics['stripe']> {
  const sandbox = await resolvePaymentSandboxMode();
  return { configured: isStripeEnvConfigured(sandbox) };
}
