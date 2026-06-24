import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { normalizeSlug as normalizeCategorySlug } from '@/lib/slug';

export { normalizeCategorySlug };
export const DEFAULT_CATEGORY_LOCALE = 'en';

function categoryFieldSql(categoryIdColumn: SQLWrapper, field: 'name' | 'slug' | 'description'): SQL<string | null> {
  return sql<string | null>`COALESCE(
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categoryIdColumn} AND ct.locale = ${DEFAULT_CATEGORY_LOCALE} LIMIT 1),
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categoryIdColumn} ORDER BY ct.created_at ASC LIMIT 1)
  )`;
}

export function categoryNameSql(categoryIdColumn: SQLWrapper) {
  return categoryFieldSql(categoryIdColumn, 'name');
}

export function categorySlugSql(categoryIdColumn: SQLWrapper) {
  return categoryFieldSql(categoryIdColumn, 'slug');
}

export function categoryDescriptionSql(categoryIdColumn: SQLWrapper) {
  return categoryFieldSql(categoryIdColumn, 'description');
}
