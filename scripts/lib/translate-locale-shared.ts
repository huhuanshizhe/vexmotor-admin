import { asc, and, eq, ne } from 'drizzle-orm';

import type { ContentTranslateType } from '@/lib/content-translate-config';
import { joinTextOptionsMultiline, splitTextOptionsMultiline } from '@/lib/feature-definition-content';
import type { EditorialContentPayload } from '@/lib/editorial-content';
import type { AdminProductPayload } from '@/lib/product-content';
import { resolveSlugForSave } from '@/lib/slug';
import { db } from '@/server/db';
import {
  brandTranslations,
  brands,
  categoryTranslations,
  categories,
  editorialContentTranslations,
  editorialContents,
  featureDefinitionTranslations,
  featureDefinitions,
  productTranslations,
  products,
  siteLanguages,
} from '@/server/db/schema';

export type BulkTranslateEntityType =
  | 'product'
  | 'category'
  | 'brand'
  | 'feature'
  | 'blog'
  | 'faq';

export const ALL_BULK_TRANSLATE_TYPES: BulkTranslateEntityType[] = [
  'category',
  'brand',
  'feature',
  'blog',
  'faq',
  'product',
];

export type BulkTranslateOptions = {
  locales: string[];
  sourceLocale: string;
  types: BulkTranslateEntityType[];
  skipExisting: boolean;
  delayMs: number;
  limit: number | null;
};

export function parseBulkTranslateArgs(argv: string[]): BulkTranslateOptions {
  const getArg = (name: string) => {
    const index = argv.indexOf(name);
    if (index >= 0 && argv[index + 1]) return argv[index + 1];
    return null;
  };

  const typesArg = getArg('--types');
  const types = typesArg
    ? typesArg.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean) as BulkTranslateEntityType[]
    : [...ALL_BULK_TRANSLATE_TYPES];

  const locales = (getArg('--locales') ?? 'de,es')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const limitRaw = getArg('--limit');
  const limit = limitRaw ? Number(limitRaw) : null;

  return {
    locales,
    sourceLocale: getArg('--source-locale') ?? '',
    types,
    skipExisting: argv.includes('--skip-existing'),
    delayMs: Number(getArg('--delay-ms') ?? '400') || 400,
    limit: Number.isFinite(limit) && limit! > 0 ? limit! : null,
  };
}

export function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function normalizeImportText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeImportSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeImportText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function loadDefaultSourceLocale() {
  if (!db) throw new Error('DATABASE_URL is required');

  const [defaultRow] = await db
    .select({ code: siteLanguages.code })
    .from(siteLanguages)
    .where(eq(siteLanguages.isDefault, true))
    .limit(1);

  if (defaultRow?.code) return defaultRow.code;

  const [firstActive] = await db
    .select({ code: siteLanguages.code })
    .from(siteLanguages)
    .where(eq(siteLanguages.status, 'active'))
    .orderBy(asc(siteLanguages.sortOrder), asc(siteLanguages.code))
    .limit(1);

  return firstActive?.code ?? 'en';
}

export function pickSourceRow<T extends { locale: string }>(rows: T[], sourceLocale: string) {
  return rows.find((row) => row.locale === sourceLocale)
    ?? rows.find((row) => row.locale === 'en')
    ?? rows[0]
    ?? null;
}

export async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveUniqueProductSlug(name: string, locale: string, productId: string) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [conflict] = await db!
      .select({ id: productTranslations.id })
      .from(productTranslations)
      .where(and(eq(productTranslations.slug, candidate), eq(productTranslations.locale, locale)))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${productId.slice(0, 8)}`;
  }
}

export async function resolveUniqueCategorySlug(
  name: string,
  locale: string,
  categoryId: string,
  excludeTranslationId?: string,
) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `category-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const conditions = [eq(categoryTranslations.slug, candidate), eq(categoryTranslations.locale, locale)];
    if (excludeTranslationId) conditions.push(ne(categoryTranslations.id, excludeTranslationId));
    const [conflict] = await db!
      .select({ id: categoryTranslations.id })
      .from(categoryTranslations)
      .where(and(...conditions))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${categoryId.slice(0, 8)}`;
  }
}

export async function resolveUniqueBrandSlug(
  name: string,
  locale: string,
  brandId: string,
  excludeTranslationId?: string,
) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `brand-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const conditions = [eq(brandTranslations.slug, candidate), eq(brandTranslations.locale, locale)];
    if (excludeTranslationId) conditions.push(ne(brandTranslations.id, excludeTranslationId));
    const [conflict] = await db!
      .select({ id: brandTranslations.id })
      .from(brandTranslations)
      .where(and(...conditions))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${brandId.slice(0, 8)}`;
  }
}

export async function resolveUniqueEditorialSlug(
  title: string,
  locale: string,
  contentModule: 'editorial' | 'faq',
  contentId: string,
  excludeTranslationId?: string,
) {
  const base = resolveSlugForSave({ sourceText: title }) ?? `content-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const conditions = [
      eq(editorialContentTranslations.slug, candidate),
      eq(editorialContentTranslations.locale, locale),
      eq(editorialContentTranslations.contentModule, contentModule),
    ];
    if (excludeTranslationId) conditions.push(ne(editorialContentTranslations.id, excludeTranslationId));
    const [conflict] = await db!
      .select({ id: editorialContentTranslations.id })
      .from(editorialContentTranslations)
      .where(and(...conditions))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${contentId.slice(0, 8)}`;
  }
}

export function tagsToText(tags: string[] | null | undefined) {
  return (tags ?? []).join('\n');
}

export function productPayloadToTranslateFields(
  source: typeof productTranslations.$inferSelect,
): Record<string, string> {
  const payload = source.payload as AdminProductPayload;
  return {
    name: source.name,
    shortDescription: source.shortDescription ?? '',
    descriptionLong: source.descriptionLong ?? '',
    coverAlt: payload.coverAlt ?? '',
    certificationsText: (payload.certifications ?? []).join('\n'),
    tagsText: tagsToText(payload.tags),
    seoTitle: source.seoTitle ?? '',
    seoDescription: source.seoDescription ?? '',
  };
}

export function categoryPayloadToTranslateFields(
  source: typeof categoryTranslations.$inferSelect,
): Record<string, string> {
  const payload = source.payload as { tags?: string[] };
  return {
    name: source.name,
    description: source.description ?? '',
    tagsText: tagsToText(payload.tags),
    seoTitle: source.seoTitle ?? '',
    seoDescription: source.seoDescription ?? '',
  };
}

export function brandPayloadToTranslateFields(
  source: typeof brandTranslations.$inferSelect,
): Record<string, string> {
  const payload = source.payload as { tags?: string[] };
  return {
    name: source.name,
    description: source.description ?? '',
    tagsText: tagsToText(payload.tags),
    seoTitle: source.seoTitle ?? '',
    seoDescription: source.seoDescription ?? '',
  };
}

export function featurePayloadToTranslateFields(
  source: typeof featureDefinitionTranslations.$inferSelect,
): Record<string, string> {
  return {
    name: source.name,
    unit: source.unit ?? '',
    textOptionsText: joinTextOptionsMultiline(source.textOptions ?? []),
  };
}

export function editorialPayloadToTranslateFields(
  source: typeof editorialContentTranslations.$inferSelect,
  contentType: Extract<ContentTranslateType, 'blog' | 'faq'>,
): Record<string, string> {
  const payload = source.payload as EditorialContentPayload;
  if (contentType === 'faq') {
    return {
      title: source.title,
      body: payload.body ?? '',
      seoTitle: source.seoTitle ?? '',
      seoDescription: source.seoDescription ?? '',
    };
  }

  return {
    title: source.title,
    category: payload.category ?? '',
    summary: source.summary ?? '',
    body: payload.body ?? '',
    authorName: payload.authorName ?? '',
    authorTitle: payload.authorTitle ?? '',
    authorBio: payload.authorBio ?? '',
    tagsText: tagsToText(payload.tags),
    seoTitle: source.seoTitle ?? '',
    seoDescription: source.seoDescription ?? '',
    relatedProductSlugsText: (payload.relatedProductSlugs ?? []).join('\n'),
  };
}

export type TranslateRunStats = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export function createStats(): TranslateRunStats {
  return { processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
}

export async function touchParentUpdatedAt(table: 'products' | 'categories' | 'brands' | 'featureDefinitions' | 'editorialContents', id: string) {
  const now = new Date();
  switch (table) {
    case 'products':
      await db!.update(products).set({ updatedAt: now }).where(eq(products.id, id));
      break;
    case 'categories':
      await db!.update(categories).set({ updatedAt: now }).where(eq(categories.id, id));
      break;
    case 'brands':
      await db!.update(brands).set({ updatedAt: now }).where(eq(brands.id, id));
      break;
    case 'featureDefinitions':
      await db!.update(featureDefinitions).set({ updatedAt: now }).where(eq(featureDefinitions.id, id));
      break;
    case 'editorialContents':
      await db!.update(editorialContents).set({ updatedAt: now }).where(eq(editorialContents.id, id));
      break;
    default:
      break;
  }
}
