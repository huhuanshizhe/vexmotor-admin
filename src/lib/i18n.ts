export const SUPPORTED_LOCALES = ['en', 'de', 'es'] as const;
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export const SUPPORTED_UNIT_SYSTEMS = ['imperial', 'metric'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export type UnitSystem = (typeof SUPPORTED_UNIT_SYSTEMS)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'site_locale';
export const CURRENCY_COOKIE_NAME = 'site_currency';
export const UNIT_SYSTEM_COOKIE_NAME = 'site_unit_system';
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const LOCALE_REQUEST_HEADER = 'x-vex-locale';

const localeDefaults: Record<Locale, { currency: Currency; unitSystem: UnitSystem; label: string }> = {
  en: { currency: 'USD', unitSystem: 'imperial', label: 'English' },
  de: { currency: 'EUR', unitSystem: 'metric', label: 'Deutsch' },
  es: { currency: 'EUR', unitSystem: 'metric', label: 'Español' },
};

export type SitePreferences = {
  locale: Locale;
  currency: Currency;
  unitSystem: UnitSystem;
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as Locale));
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function normalizeCurrency(value: string | null | undefined): Currency | null {
  return value && SUPPORTED_CURRENCIES.includes(value as Currency) ? (value as Currency) : null;
}

export function normalizeUnitSystem(value: string | null | undefined): UnitSystem | null {
  return value && SUPPORTED_UNIT_SYSTEMS.includes(value as UnitSystem) ? (value as UnitSystem) : null;
}

const countryToLocale: Record<string, Locale> = {
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
  DE: 'de', AT: 'de', CH: 'de',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
};

const countryToCurrency: Record<string, Currency> = {
  US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', AT: 'EUR',
  BE: 'EUR', LU: 'EUR', IE: 'EUR', CH: 'EUR',
  CA: 'USD', AU: 'USD', NZ: 'USD',
  MX: 'USD', AR: 'USD', CO: 'USD', CL: 'USD', PE: 'USD',
};

export function detectLocaleFromCountry(countryCode: string | null | undefined): Locale | null {
  if (!countryCode) return null;
  return countryToLocale[countryCode.toUpperCase()] ?? null;
}

export function detectCurrencyFromCountry(countryCode: string | null | undefined): Currency | null {
  if (!countryCode) return null;
  return countryToCurrency[countryCode.toUpperCase()] ?? null;
}

export function getEffectiveCurrency(locale: Locale, countryCode?: string | null): Currency {
  const countryCurrency = detectCurrencyFromCountry(countryCode);
  if (countryCurrency) return countryCurrency;
  return localeDefaults[locale].currency;
}

export function getMarketDefaults(locale: Locale, countryCode?: string | null) {
  return {
    ...localeDefaults[locale],
    currency: getEffectiveCurrency(locale, countryCode),
  };
}

export function getLocaleLabel(locale: Locale) {
  return localeDefaults[locale].label;
}

export function parseLocaleFromPathname(pathname: string) {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const [firstSegment, ...restSegments] = normalizedPathname.split('/').filter(Boolean);

  if (isSupportedLocale(firstSegment)) {
    const strippedPathname = restSegments.length ? `/${restSegments.join('/')}` : '/';

    return {
      locale: firstSegment,
      pathname: strippedPathname,
      hadPrefix: true,
    };
  }

  return {
    locale: DEFAULT_LOCALE,
    pathname: normalizedPathname || '/',
    hadPrefix: false,
  };
}

export function withLocalePath(pathname: string, locale: Locale) {
  if (!pathname.startsWith('/')) {
    return pathname;
  }

  if (pathname === '/') {
    return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
  }

  return locale === DEFAULT_LOCALE ? pathname : `/${locale}${pathname}`;
}

export function toPreferenceCookie(name: string, value: string, maxAge = PREFERENCE_COOKIE_MAX_AGE) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
