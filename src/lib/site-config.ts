function normalizeSiteUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, '') || null;
}

function resolveSiteUrl() {
  const explicitSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  const vercelProductionUrl = normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProductionUrl) {
    return vercelProductionUrl.startsWith('http') ? vercelProductionUrl : `https://${vercelProductionUrl}`;
  }

  return process.env.NODE_ENV === 'production' ? 'https://www.stepmotech.online' : 'http://localhost:4000';
}

export const SITE_NAME = 'STEPMOTECH';
export const SITE_LEGACY_NAME = 'VexMotor';
export const SITE_URL = resolveSiteUrl();

export const DEFAULT_SEO_TITLE = 'STEPMOTECH — Precision Stepper, BLDC & Servo Motors';
export const DEFAULT_SEO_DESCRIPTION =
  'Engineering-grade motion components. Ship worldwide from US/EU/CN warehouses. Datasheets, CAD, tiered pricing.';

export const NOTIFICATION_BAR_COOKIE_NAME = 'site_notice_dismissed';
export const NOTIFICATION_BAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const notificationBarConfig = {
  id: 'global-shipping-and-rfq',
  message: 'Worldwide DHL, FedEx, UPS and sea freight support for stocked catalog items and RFQ projects.',
  ctaLabel: 'Shipping & Customs',
  ctaHref: '/support/shipping',
};