import { cookies, headers } from 'next/headers';

import {
  CURRENCY_COOKIE_NAME,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_REQUEST_HEADER,
  UNIT_SYSTEM_COOKIE_NAME,
  getMarketDefaults,
  normalizeCurrency,
  normalizeLocale,
  normalizeUnitSystem,
  type Locale,
  type SitePreferences,
} from '@/lib/i18n';

// Server-side translation JSON imports (no 'use client' boundary)
import enTranslations from '@/locales/en.json';
import deTranslations from '@/locales/de.json';
import esTranslations from '@/locales/es.json';

type TranslationObject = Record<string, any>;
type TranslationParams = Record<string, string | number | boolean>;

const translations: Record<Locale, TranslationObject> = {
  en: enTranslations,
  de: deTranslations,
  es: esTranslations,
};

function getNestedValue(obj: TranslationObject, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function interpolateString(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}

/**
 * Server-side translation helper — safe to use in Server Components.
 * Unlike the `getTranslations` in i18n-context.tsx (which is 'use client'),
 * this version imports JSON directly and has no client boundary.
 */
export function getServerTranslations(locale: Locale = DEFAULT_LOCALE) {
  return {
    t: (key: string, params?: TranslationParams): string => {
      const translationObj = translations[locale] || translations[DEFAULT_LOCALE];
      const template = getNestedValue(translationObj, key);
      if (typeof template === 'string') {
        return interpolateString(template, params);
      }
      return key;
    },
    locale,
  };
}

export async function getServerSitePreferences(): Promise<SitePreferences> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = normalizeLocale(headerStore.get(LOCALE_REQUEST_HEADER) ?? cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const defaults = getMarketDefaults(locale);

  return {
    locale,
    currency: normalizeCurrency(cookieStore.get(CURRENCY_COOKIE_NAME)?.value) ?? defaults.currency,
    unitSystem: normalizeUnitSystem(cookieStore.get(UNIT_SYSTEM_COOKIE_NAME)?.value) ?? defaults.unitSystem,
  };
}