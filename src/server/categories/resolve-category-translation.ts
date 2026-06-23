import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export const DEFAULT_CATEGORY_LOCALE = 'en';

export function normalizeCategorySlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

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
