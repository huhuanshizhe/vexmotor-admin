import deDefaults from '../../../vexmotor-web/src/ui-strings/locale-defaults/de.json';
import esDefaults from '../../../vexmotor-web/src/ui-strings/locale-defaults/es.json';

type NestedRecord = Record<string, unknown>;

function flattenTranslations(obj: NestedRecord, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenTranslations(value as NestedRecord, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }

  return result;
}

const LOCALE_DEFAULTS: Record<string, Record<string, string>> = {
  de: flattenTranslations(deDefaults as NestedRecord),
  es: flattenTranslations(esDefaults as NestedRecord),
};

export function getBundledUiStringLocaleDefault(locale: string, key: string): string | undefined {
  return LOCALE_DEFAULTS[locale]?.[key];
}
