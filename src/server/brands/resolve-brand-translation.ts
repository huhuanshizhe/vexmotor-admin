import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export const DEFAULT_BRAND_LOCALE = 'en';

export function normalizeBrandSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function pickPrimaryBrandLocale(locales: string[], preferredLocales: string[] = [DEFAULT_BRAND_LOCALE]) {
  for (const preferred of preferredLocales) {
    const match = locales.find((locale) => locale.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return [...locales].sort()[0] ?? DEFAULT_BRAND_LOCALE;
}

function brandFieldSql(brandIdColumn: SQLWrapper, field: 'name' | 'slug'): SQL<string> {
  return sql<string>`COALESCE(
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${brandIdColumn} AND bt.locale = ${DEFAULT_BRAND_LOCALE} LIMIT 1),
    (SELECT bt.${sql.raw(field)} FROM brand_translations bt
      WHERE bt.brand_id = ${brandIdColumn} ORDER BY bt.created_at ASC LIMIT 1)
  )`;
}

export function brandNameSql(brandIdColumn: SQLWrapper) {
  return brandFieldSql(brandIdColumn, 'name');
}

export function brandSlugSql(brandIdColumn: SQLWrapper) {
  return brandFieldSql(brandIdColumn, 'slug');
}
