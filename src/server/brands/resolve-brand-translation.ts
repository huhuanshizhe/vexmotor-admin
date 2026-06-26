import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { normalizeSlug as normalizeBrandSlug } from '@/lib/slug';

export { normalizeBrandSlug };
export const DEFAULT_BRAND_LOCALE = 'en';

function brandFieldSql(
  brandIdColumn: SQLWrapper,
  field: 'name' | 'slug',
  locale: string = DEFAULT_BRAND_LOCALE,
): SQL<string> {
  return sql<string>`COALESCE(
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${brandIdColumn} AND bt.locale = ${locale} LIMIT 1),
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${brandIdColumn} AND bt.locale = ${DEFAULT_BRAND_LOCALE} LIMIT 1),
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${brandIdColumn} ORDER BY bt.created_at ASC LIMIT 1)
  )`;
}

export function brandNameSql(brandIdColumn: SQLWrapper, locale: string = DEFAULT_BRAND_LOCALE) {
  return brandFieldSql(brandIdColumn, 'name', locale);
}

export function brandSlugSql(brandIdColumn: SQLWrapper, locale: string = DEFAULT_BRAND_LOCALE) {
  return brandFieldSql(brandIdColumn, 'slug', locale);
}

export function pickPrimaryBrandLocale(locales: string[], preferredLocales: string[] = [DEFAULT_BRAND_LOCALE]) {
  for (const preferred of preferredLocales) {
    const match = locales.find((item) => item.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return [...locales].sort()[0] ?? DEFAULT_BRAND_LOCALE;
}
