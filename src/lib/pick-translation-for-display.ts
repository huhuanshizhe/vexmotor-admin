export type TranslationLocaleRow = {
  locale: string;
  createdAt?: Date | string;
};

function resolveCreatedAt(value: Date | string | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** 按站点默认语言选取展示用翻译；无默认语言版本时回退到最早创建的翻译。 */
export function pickTranslationForDisplay<T extends TranslationLocaleRow>(
  translations: T[],
  defaultLocale: string,
): T | null {
  if (!translations.length) return null;

  const normalizedDefault = defaultLocale.trim().toLowerCase();
  if (normalizedDefault) {
    const match = translations.find((item) => item.locale.toLowerCase() === normalizedDefault);
    if (match) return match;
  }

  const sorted = [...translations].sort(
    (left, right) => resolveCreatedAt(left.createdAt) - resolveCreatedAt(right.createdAt),
  );
  return sorted[0] ?? null;
}
