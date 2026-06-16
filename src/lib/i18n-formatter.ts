/**
 * Enhanced i18n utilities with message formatting and pluralization
 * Similar to next-intl functionality but using our existing translation system
 */

import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n';
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

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: TranslationObject, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Pluralization rules for supported locales
 */
const pluralRules: Record<Locale, (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'> = {
  en: (count) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  },
  de: (count) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  },
  es: (count) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  },
};

/**
 * Format number according to locale
 */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, options).format(value);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(value: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date | string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, options).format(dateObj);
}

/**
 * Handle pluralization in translations
 * Supports: {count, plural, one {item} other {items}}
 */
export function handlePluralization(
  template: string,
  count: number,
  locale: Locale,
  params?: TranslationParams
): string {
  const pluralForm = pluralRules[locale](count);
  
  // Match plural syntax: {count, plural, one {...} other {...}}
  const pluralRegex = /\{(\w+),\s*plural,\s*(.+?)\}/g;
  
  return template.replace(pluralRegex, (match, param, forms) => {
    if (param !== 'count') return match;
    
    // Parse forms: one {item} other {items}
    const formRegex = /(zero|one|two|few|many|other)\s*\{([^}]*)\}/g;
    let result: string | null = null;
    
    let formMatch;
    while ((formMatch = formRegex.exec(forms)) !== null) {
      if (formMatch[1] === pluralForm) {
        result = formMatch[2];
        break;
      }
      if (formMatch[1] === 'other') {
        result = formMatch[2]; // Fallback to 'other'
      }
    }
    
    if (!result) return match;
    
    // Replace count in result
    return result.replace(/\{count\}/g, String(count));
  });
}

/**
 * Rich text formatting in translations
 * Supports: <b>bold</b>, <i>italic</i>, <link>...</link>
 */
export function formatRichText(
  template: string,
  params?: TranslationParams,
  components?: Record<string, React.ComponentType<any>>
): string | React.ReactNode {
  if (!components) {
    // Return plain text if no components provided
    return interpolateString(template, params);
  }
  
  // Simple rich text processing
  let result = interpolateString(template, params);
  
  // Replace <b>...</b> with <strong>...</strong>
  result = result.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>');
  result = result.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
  
  return result;
}

/**
 * Interpolate params into string
 */
function interpolateString(template: string, params?: TranslationParams): string {
  if (!params) return template;
  
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}

/**
 * Enhanced translation function with formatting support
 */
export function t(
  key: string,
  options: {
    locale?: Locale;
    params?: TranslationParams;
    count?: number;
    defaultValue?: string;
  } = {}
): string {
  const { locale = DEFAULT_LOCALE, params, count, defaultValue } = options;
  
  const translationObj = translations[locale] || translations[DEFAULT_LOCALE];
  let template = getNestedValue(translationObj, key);
  
  if (typeof template !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Translation key not found: "${key}" for locale "${locale}"`);
    }
    return defaultValue || key;
  }
  
  // Handle pluralization if count is provided
  if (count !== undefined) {
    template = handlePluralization(template, count, locale, params);
  }
  
  // Interpolate params
  return interpolateString(template, params);
}

/**
 * Get all translations for a locale (for code splitting)
 */
export function getTranslationsForLocale(locale: Locale): TranslationObject {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

/**
 * Check if translation key exists
 */
export function hasTranslation(key: string, locale: Locale = DEFAULT_LOCALE): boolean {
  const translationObj = translations[locale] || translations[DEFAULT_LOCALE];
  return getNestedValue(translationObj, key) !== undefined;
}

/**
 * Get available locales
 */
export function getAvailableLocales() {
  return Object.keys(translations) as Locale[];
}
