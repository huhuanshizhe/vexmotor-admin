import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { normalizeSlug as normalizeCategorySlug } from '@/lib/slug';

export { normalizeCategorySlug };
export const DEFAULT_CATEGORY_LOCALE = 'en';

function categoryFieldSql(
  categoryIdColumn: SQLWrapper,
  field: 'name' | 'slug' | 'description',
  locale: string = DEFAULT_CATEGORY_LOCALE,
): SQL<string | null> {
  return sql<string | null>`COALESCE(
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categoryIdColumn} AND ct.locale = ${locale} LIMIT 1),
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categoryIdColumn} AND ct.locale = ${DEFAULT_CATEGORY_LOCALE} LIMIT 1),
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categoryIdColumn} ORDER BY ct.created_at ASC LIMIT 1)
  )`;
}

export function categoryNameSql(categoryIdColumn: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql(categoryIdColumn, 'name', locale);
}

export function categorySlugSql(categoryIdColumn: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql(categoryIdColumn, 'slug', locale);
}

export function categoryDescriptionSql(categoryIdColumn: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql(categoryIdColumn, 'description', locale);
}
