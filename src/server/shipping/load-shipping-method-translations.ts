import type { shippingMethodTranslations } from '@/server/db/schema';

export type ShippingMethodTranslationRow = typeof shippingMethodTranslations.$inferSelect;

const DEFAULT_SHIPPING_METHOD_LOCALE = 'en';

export function pickShippingMethodTranslation(
  translations: ShippingMethodTranslationRow[] | undefined,
  locale: string,
): ShippingMethodTranslationRow | null {
  if (!translations?.length) return null;

  const normalizedLocale = locale.trim().toLowerCase();
  const exact = translations.find((item) => item.locale.toLowerCase() === normalizedLocale);
  if (exact) return exact;

  const english = translations.find((item) => item.locale.toLowerCase() === DEFAULT_SHIPPING_METHOD_LOCALE);
  if (english) return english;

  return [...translations].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0] ?? null;
}

export async function loadShippingMethodTranslationsByMethodIds(methodIds: string[]) {
  if (!methodIds.length) return new Map<string, ShippingMethodTranslationRow[]>();

  const { db } = await import('@/server/db');
  const { shippingMethodTranslations } = await import('@/server/db/schema');
  const { asc, inArray } = await import('drizzle-orm');

  const rows = await db
    .select()
    .from(shippingMethodTranslations)
    .where(inArray(shippingMethodTranslations.shippingMethodId, methodIds))
    .orderBy(asc(shippingMethodTranslations.locale));

  const grouped = new Map<string, ShippingMethodTranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.shippingMethodId) ?? [];
    bucket.push(row);
    grouped.set(row.shippingMethodId, bucket);
  }

  return grouped;
}
