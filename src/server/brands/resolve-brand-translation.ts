import { sql, type Column, type SQL } from 'drizzle-orm';

import { normalizeSlug as normalizeBrandSlug } from '@/lib/slug';
import { correlatedColumnSql } from '@/server/db/correlated-column-sql';

export { normalizeBrandSlug };
export const DEFAULT_BRAND_LOCALE = 'en';

function brandFieldSql(
  brandIdColumn: Column,
  field: 'name' | 'slug',
  locale: string = DEFAULT_BRAND_LOCALE,
): SQL<string> {
  const outerBrandId = correlatedColumnSql(brandIdColumn);
  return sql<string>`COALESCE(
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${outerBrandId} AND bt.locale = ${locale} LIMIT 1),
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${outerBrandId} AND bt.locale = ${DEFAULT_BRAND_LOCALE} LIMIT 1),
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${outerBrandId} ORDER BY bt.created_at ASC LIMIT 1)
  )`;
}

export function brandNameSql(brandIdColumn: Column, locale: string = DEFAULT_BRAND_LOCALE) {
  return brandFieldSql(brandIdColumn, 'name', locale);
}

export function brandSlugSql(brandIdColumn: Column, locale: string = DEFAULT_BRAND_LOCALE) {
  return brandFieldSql(brandIdColumn, 'slug', locale);
}

export function pickPrimaryBrandLocale(locales: string[], preferredLocales: string[] = [DEFAULT_BRAND_LOCALE]) {
  for (const preferred of preferredLocales) {
    const match = locales.find((item) => item.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return [...locales].sort()[0] ?? DEFAULT_BRAND_LOCALE;
}
