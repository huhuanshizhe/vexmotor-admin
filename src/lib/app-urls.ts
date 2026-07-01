function trimUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, '') || null;
}

const DEV_ADMIN_URL = 'http://localhost:5100';
const DEV_SITE_URL = 'http://localhost:5000';

/**
 * Admin console + REST API origin (e.g. http://localhost:5100).
 */
export function getAdminUrl() {
  return (
    trimUrl(process.env.ADMIN_URL)
    ?? trimUrl(process.env.AUTH_URL)
    ?? trimUrl(process.env.NEXTAUTH_URL)
    ?? (process.env.NODE_ENV !== 'production' ? DEV_ADMIN_URL : null)
    ?? DEV_ADMIN_URL
  );
}

/**
 * Customer-facing storefront origin (e.g. http://localhost:5000).
 */
export function getSiteUrl() {
  const vercelProductionUrl = trimUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const vercelUrl = vercelProductionUrl
    ? (vercelProductionUrl.startsWith('http') ? vercelProductionUrl : `https://${vercelProductionUrl}`)
    : null;

  return (
    trimUrl(process.env.SITE_URL)
    ?? trimUrl(process.env.CORS_ALLOWED_ORIGINS?.split(',')[0])
    ?? trimUrl(process.env.APP_URL)
    ?? trimUrl(process.env.NEXT_PUBLIC_SITE_URL)
    ?? trimUrl(process.env.FRONT_SITE_URL)
    ?? vercelUrl
    ?? (process.env.NODE_ENV !== 'production' ? DEV_SITE_URL : null)
    ?? DEV_SITE_URL
  );
}

/**
 * Primary storefront origin allowed by CORS. Falls back to {@link getSiteUrl}.
 */
export function getSiteCorsOrigin() {
  return trimUrl(process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]) ?? getSiteUrl();
}

export function getFrontOAuthCallbackUrl() {
  const explicit = trimUrl(process.env.FRONT_CALLBACK_URL);
  if (explicit) {
    return explicit;
  }

  return `${getSiteUrl()}/auth/callback`;
}
