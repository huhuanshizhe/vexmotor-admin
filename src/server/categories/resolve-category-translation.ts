import { sql, type Column, type SQL } from 'drizzle-orm';

import { normalizeSlug as normalizeCategorySlug } from '@/lib/slug';
import { correlatedColumnSql } from '@/server/db/correlated-column-sql';

export { normalizeCategorySlug };
export const DEFAULT_CATEGORY_LOCALE = 'en';

function categoryTranslationColumnSql(
  categoryIdColumn: Column,
  column: string,
  locale: string = DEFAULT_CATEGORY_LOCALE,
): SQL {
  const outerCategoryId = correlatedColumnSql(categoryIdColumn);
  return sql`COALESCE(
    (SELECT ct.${sql.raw(column)} FROM category_translations ct
      WHERE ct.category_id = ${outerCategoryId} AND ct.locale = ${locale} LIMIT 1),
    (SELECT ct.${sql.raw(column)} FROM category_translations ct
      WHERE ct.category_id = ${outerCategoryId} AND ct.locale = ${DEFAULT_CATEGORY_LOCALE} LIMIT 1),
    (SELECT ct.${sql.raw(column)} FROM category_translations ct
      WHERE ct.category_id = ${outerCategoryId} ORDER BY ct.created_at ASC LIMIT 1)
  )`;
}

export function categoryNameSql(categoryIdColumn: Column, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryTranslationColumnSql(categoryIdColumn, 'name', locale) as SQL<string>;
}

export function categorySlugSql(categoryIdColumn: Column, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryTranslationColumnSql(categoryIdColumn, 'slug', locale) as SQL<string>;
}

export function categoryDescriptionSql(categoryIdColumn: Column, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryTranslationColumnSql(categoryIdColumn, 'description', locale) as SQL<string | null>;
}
