import 'server-only';

import { getSiteUrl } from '@/lib/app-urls';

export type AirwallexRuntimeConfig = {
  clientId: string;
  apiKey: string;
  apiBase: string;
  env: 'demo' | 'prod';
  frontSiteUrl: string;
  returnUrlBase: string | null;
};

function trimUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, '') || null;
}

/** HTTPS storefront base for Airwallex 3DS / redirect return. Omit on plain localhost. */
export function resolveAirwallexReturnUrlBase(frontSiteUrl: string) {
  const explicit = trimUrl(process.env.AIRWALLEX_RETURN_URL);
  if (explicit) {
    return explicit;
  }

  try {
    const parsed = new URL(frontSiteUrl);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (isLocalhost || parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.origin}`;
  } catch {
    return null;
  }
}

export function getAirwallexConfig(): AirwallexRuntimeConfig | null {
  const clientId = process.env.AIRWALLEX_CLIENT_ID?.trim();
  const apiKey = process.env.AIRWALLEX_API_KEY?.trim();

  if (!clientId || !apiKey) {
    return null;
  }

  const env = process.env.AIRWALLEX_ENV === 'prod' ? 'prod' : 'demo';
  const apiBase =
    process.env.AIRWALLEX_API_BASE?.trim()
    || (env === 'prod' ? 'https://api.airwallex.com' : 'https://api-demo.airwallex.com');

  const frontSiteUrl = getSiteUrl();
  const returnUrlBase = resolveAirwallexReturnUrlBase(frontSiteUrl);

  return {
    clientId,
    apiKey,
    apiBase,
    env,
    frontSiteUrl,
    returnUrlBase,
  };
}

export function isAirwallexConfigured() {
  return getAirwallexConfig() !== null;
}
