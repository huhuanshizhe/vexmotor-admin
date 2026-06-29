import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { normalizeSlug as normalizeCategorySlug } from '@/lib/slug';
import { categories } from '@/server/db/schema';

export { normalizeCategorySlug };
export const DEFAULT_CATEGORY_LOCALE = 'en';

function categoryFieldSql(
  field: 'name' | 'slug' | 'description',
  locale: string = DEFAULT_CATEGORY_LOCALE,
): SQL<string | null> {
  // Bind to categories.id from the outer query — passing categories.id as a parameter
  // gets rewritten to the select alias "id" and breaks correlated subqueries.
  return sql<string | null>`COALESCE(
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categories.id} AND ct.locale = ${locale} LIMIT 1),
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categories.id} AND ct.locale = ${DEFAULT_CATEGORY_LOCALE} LIMIT 1),
    (SELECT ct.${sql.raw(field)} FROM category_translations ct
      WHERE ct.category_id = ${categories.id} ORDER BY ct.created_at ASC LIMIT 1)
  )`;
}

export function categoryNameSql(_categoryIdColumn?: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql('name', locale);
}

export function categorySlugSql(_categoryIdColumn?: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql('slug', locale);
}

export function categoryDescriptionSql(_categoryIdColumn?: SQLWrapper, locale: string = DEFAULT_CATEGORY_LOCALE) {
  return categoryFieldSql('description', locale);
}
