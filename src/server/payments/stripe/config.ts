import 'server-only';

export type StripeConfig = {
  secretKey: string;
  publicKey: string;
};

export function getStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publicKey = process.env.STRIPE_PUBLIC_KEY?.trim();

  if (!secretKey || !publicKey) {
    return null;
  }

  return { secretKey, publicKey };
}

export function isStripeConfigured() {
  return Boolean(getStripeConfig());
}

export function resolveStripePublicKeyMode(publicKey: string): 'test' | 'live' {
  return publicKey.startsWith('pk_live_') ? 'live' : 'test';
}

export function resolveStripeModeFromConfig(): 'test' | 'live' | null {
  const config = getStripeConfig();
  if (!config) {
    return null;
  }
  return resolveStripePublicKeyMode(config.publicKey);
}
