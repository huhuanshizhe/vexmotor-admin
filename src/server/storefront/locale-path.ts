import { and, eq } from 'drizzle-orm';

import { normalizeLocale } from '@/lib/i18n';
import { normalizeSlug } from '@/lib/slug';
import { DEFAULT_CATEGORY_LOCALE } from '@/server/categories/resolve-category-translation';
import { db } from '@/server/db';
import {
  categories,
  categoryTranslations,
  editorialContents,
  editorialContentTranslations,
  products,
  productTranslations,
} from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

type ParsedPath = {
  pathname: string;
  suffix: string;
};

type TranslationSlugRow = {
  locale: string;
  slug: string;
};

function parsePathInput(pathname: string): ParsedPath {
  const hashIndex = pathname.indexOf('#');
  const queryIndex = pathname.indexOf('?');
  const pathEnd = Math.min(
    queryIndex >= 0 ? queryIndex : pathname.length,
    hashIndex >= 0 ? hashIndex : pathname.length,
  );
  const pathOnly = pathname.slice(0, pathEnd) || '/';
  const suffix = pathname.slice(pathEnd);

  return {
    pathname: pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`,
    suffix,
  };
}

function pickSlugForLocale(rows: TranslationSlugRow[], locale: string, defaultLocale: string) {
  const normalized = normalizeLocale(locale);
  const match = rows.find((row) => row.locale === normalized);
  if (match?.slug) return match.slug;

  const fallback = rows.find((row) => row.locale === defaultLocale);
  if (fallback?.slug) return fallback.slug;

  return rows[0]?.slug ?? null;
}

async function resolveProductSlugForLocale(slugInput: string, locale: string) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;

  const [row] = await db
    .select({ productId: productTranslations.productId })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(eq(productTranslations.slug, slug), eq(products.status, 'active')))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select({ locale: productTranslations.locale, slug: productTranslations.slug })
    .from(productTranslations)
    .where(eq(productTranslations.productId, row.productId));

  return pickSlugForLocale(translations, locale, DEFAULT_PRODUCT_LOCALE);
}

async function resolveCategorySlugForLocale(slugInput: string, locale: string) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;

  const [row] = await db
    .select({ categoryId: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(and(eq(categoryTranslations.slug, slug), eq(categories.status, 'active')))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select({ locale: categoryTranslations.locale, slug: categoryTranslations.slug })
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, row.categoryId));

  return pickSlugForLocale(translations, locale, DEFAULT_CATEGORY_LOCALE);
}

async function resolveBlogSlugForLocale(slugInput: string, locale: string) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;

  const [row] = await db
    .select({ contentId: editorialContentTranslations.contentId })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(
      eq(editorialContentTranslations.slug, slug),
      eq(editorialContentTranslations.contentModule, 'editorial'),
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
    ))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select({ locale: editorialContentTranslations.locale, slug: editorialContentTranslations.slug })
    .from(editorialContentTranslations)
    .where(and(
      eq(editorialContentTranslations.contentId, row.contentId),
      eq(editorialContentTranslations.contentModule, 'editorial'),
    ));

  return pickSlugForLocale(translations, locale, DEFAULT_PRODUCT_LOCALE);
}

/** Resolve a locale-neutral internal path to the target locale slug (path without locale prefix). */
export async function resolveLocalizedPath(pathname: string, toLocaleInput?: string | null): Promise<string> {
  const { pathname: pathOnly, suffix } = parsePathInput(pathname);
  const toLocale = normalizeLocale(toLocaleInput);
  const segments = pathOnly.split('/').filter(Boolean);

  if (segments[0] === 'products' && segments[1]) {
    const targetSlug = await resolveProductSlugForLocale(decodeURIComponent(segments[1]), toLocale);
    if (targetSlug) {
      return `/products/${targetSlug}${suffix}`;
    }
  }

  if (segments[0] === 'c' && segments[1]) {
    const targetSlug = await resolveCategorySlugForLocale(decodeURIComponent(segments[1]), toLocale);
    if (targetSlug) {
      return `/c/${targetSlug}${suffix}`;
    }
  }

  if (segments[0] === 'blog' && segments[1] && segments[1] !== 't') {
    const targetSlug = await resolveBlogSlugForLocale(decodeURIComponent(segments[1]), toLocale);
    if (targetSlug) {
      return `/blog/${targetSlug}${suffix}`;
    }
  }

  return `${pathOnly}${suffix}`;
}
