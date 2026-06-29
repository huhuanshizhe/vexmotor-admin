import { asc, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import { categoryTranslations } from '@/server/db/schema';

import { DEFAULT_CATEGORY_LOCALE } from './resolve-category-translation';

type CategoryTranslationRow = typeof categoryTranslations.$inferSelect;

export async function loadCategoryTranslationsByCategoryIds(categoryIds: string[]) {
  if (!categoryIds.length) {
    return new Map<string, CategoryTranslationRow[]>();
  }

  const rows = await db
    .select()
    .from(categoryTranslations)
    .where(inArray(categoryTranslations.categoryId, categoryIds))
    .orderBy(asc(categoryTranslations.locale));

  const grouped = new Map<string, CategoryTranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.categoryId) ?? [];
    bucket.push(row);
    grouped.set(row.categoryId, bucket);
  }

  return grouped;
}

export function pickCategoryTranslation(
  translations: CategoryTranslationRow[] | undefined,
  locale: string,
): CategoryTranslationRow | null {
  if (!translations?.length) {
    return null;
  }

  return (
    translations.find((item) => item.locale === locale)
    ?? translations.find((item) => item.locale === DEFAULT_CATEGORY_LOCALE)
    ?? [...translations].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0]
    ?? null
  );
}

export function resolveCategoryTranslationFields(
  translations: CategoryTranslationRow[] | undefined,
  locale: string,
) {
  const primary = pickCategoryTranslation(translations, locale);
  return {
    name: primary?.name ?? '',
    slug: primary?.slug ?? '',
    description: primary?.description ?? null,
  };
}
