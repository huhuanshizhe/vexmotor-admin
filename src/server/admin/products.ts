import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { z } from 'zod';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import {
  type AdminProductListItem,
  type AdminProductPayload,
  type AdminProductTranslation,
  defaultProductPayload,
  type ProductLifecycleStatus,
  type ProductPurchaseMode,
  productLifecycleStatuses,
  productPurchaseModes,
  productStatuses,
  type ProductStatus,
} from '@/lib/product-content';
import type { ProductListQuery } from '@/lib/product-list-query';
import { resolveSlugForSave } from '@/lib/slug';
import { getAdminBrandOptions } from '@/server/admin/brands';
import { getAdminCategoryOptions } from '@/server/admin/categories';
import { countProductFeatureAssignmentsByProductIds } from '@/server/admin/product-features';
import { db } from '@/server/db';
import { brands, categories, productCategories, productTranslations, products } from '@/server/db/schema';
import { brandNameSql } from '@/server/brands/resolve-brand-translation';
import { categoryNameSql } from '@/server/categories/resolve-category-translation';
import { DEFAULT_PRODUCT_LOCALE, normalizeProductSlug } from '@/server/products/resolve-product-translation';

const gallerySchema = z.array(z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().default(''),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
})).default([]);

const attachmentSchema = z.array(z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
})).default([]);

const payloadSchema = z.object({
  coverUrl: z.string().trim().nullable().optional(),
  coverAlt: z.string().trim().nullable().optional(),
  gallery: gallerySchema.optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  attachments: attachmentSchema.optional(),
  certifications: z.array(z.string().trim().min(1)).default([]),
});

export const adminProductTranslationSchema = z.object({
  productId: z.string().uuid().optional(),
  locale: z.string().trim().min(2).default(DEFAULT_PRODUCT_LOCALE),
  spu: z.string().trim().min(1),
  brandId: z.string().uuid().nullable().optional(),
  defaultCategoryId: z.string().uuid().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  purchaseMode: z.enum(productPurchaseModes).optional(),
  paidSampleEnabled: z.boolean().optional(),
  featured: z.boolean().optional(),
  featuredSortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(productStatuses).optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  shortDescription: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  descriptionLong: z.string().trim().nullable().optional(),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  currencyCode: z.string().trim().length(3),
  stockQuantity: z.coerce.number().int().min(0),
  moq: z.coerce.number().int().min(1).optional(),
  leadTimeMin: z.coerce.number().int().min(0).optional(),
  leadTimeMax: z.coerce.number().int().min(0).optional(),
  leadTimeUnit: z.string().trim().optional(),
  lifecycleStatus: z.enum(productLifecycleStatuses).optional(),
  eolDate: z.string().trim().nullable().optional(),
  lastTimeBuyDate: z.string().trim().nullable().optional(),
  efficiencyClass: z.string().trim().nullable().optional(),
  payload: payloadSchema.optional(),
});

export const adminProductTranslationPatchSchema = adminProductTranslationSchema.partial();
export const adminProductPatchSchema = z.object({
  spu: z.string().trim().min(1).optional(),
  brandId: z.string().uuid().nullable().optional(),
  defaultCategoryId: z.string().uuid().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  purchaseMode: z.enum(productPurchaseModes).optional(),
  paidSampleEnabled: z.boolean().optional(),
  featured: z.boolean().optional(),
  featuredSortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(productStatuses).optional(),
});

type TranslationCreateInput = z.infer<typeof adminProductTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminProductTranslationPatchSchema>;
type ProductPatchInput = z.infer<typeof adminProductPatchSchema>;

type ProductRow = typeof products.$inferSelect;
type TranslationRow = typeof productTranslations.$inferSelect;

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || DEFAULT_PRODUCT_LOCALE;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePayload(payload: AdminProductPayload | undefined): AdminProductPayload {
  const base = payload ?? defaultProductPayload();
  return {
    coverUrl: normalizeText(base.coverUrl),
    coverAlt: normalizeText(base.coverAlt),
    gallery: (base.gallery ?? []).map((item) => ({
      url: item.url.trim(),
      alt: item.alt?.trim() ?? '',
      width: item.width ?? null,
      height: item.height ?? null,
    })).filter((item) => item.url),
    tags: (base.tags ?? []).map((item) => item.trim()).filter(Boolean),
    attachments: (base.attachments ?? []).map((item) => ({
      name: item.name.trim(),
      url: item.url.trim(),
      mimeType: item.mimeType.trim(),
    })).filter((item) => item.url),
    certifications: (base.certifications ?? []).map((item) => item.trim()).filter(Boolean),
  };
}

function resolveCategoryFields(input: {
  categoryIds?: string[];
  defaultCategoryId?: string | null;
}) {
  if (input.categoryIds !== undefined) {
    const categoryIds = [...new Set(input.categoryIds.filter(Boolean))];
    return {
      categoryIds,
      defaultCategoryId: categoryIds[0] ?? null,
    };
  }

  const defaultCategoryId = input.defaultCategoryId ?? null;
  return {
    categoryIds: defaultCategoryId ? [defaultCategoryId] : [],
    defaultCategoryId,
  };
}

async function loadProductCategoryIds(productId: string) {
  const rows = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId));
  return rows.map((row) => row.categoryId);
}

async function syncProductCategories(productId: string, categoryIds: string[]) {
  const uniqueIds = [...new Set(categoryIds.filter(Boolean))];
  await db.delete(productCategories).where(eq(productCategories.productId, productId));
  if (!uniqueIds.length) return;
  await db.insert(productCategories).values(
    uniqueIds.map((categoryId) => ({ productId, categoryId })),
  );
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const normalizedName = input.name.trim();
  const normalizedSlug = resolveSlugForSave({
    sourceText: normalizedName,
    slug: input.slug,
  });
  const normalizedPayload = normalizePayload(input.payload as AdminProductPayload | undefined);
  const { categoryIds, defaultCategoryId } = resolveCategoryFields(input);

  return {
    locale: normalizeLocale(input.locale),
    spu: input.spu.trim(),
    brandId: input.brandId ?? null,
    defaultCategoryId,
    categoryIds,
    purchaseMode: (input.purchaseMode ?? 'buy') as ProductPurchaseMode,
    paidSampleEnabled: input.paidSampleEnabled ?? false,
    featured: input.featured ?? false,
    featuredSortOrder: input.featuredSortOrder ?? 0,
    status: (input.status ?? 'inactive') as ProductStatus,
    name: normalizedName,
    slug: normalizedSlug || `product-${Date.now()}`,
    shortDescription: normalizeText(input.shortDescription),
    description: normalizeText(input.description),
    descriptionLong: normalizeText(input.descriptionLong),
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedName, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? input.shortDescription, 160),
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    currencyCode: input.currencyCode.trim().toUpperCase(),
    stockQuantity: input.stockQuantity,
    moq: input.moq ?? 1,
    leadTimeMin: input.leadTimeMin ?? 3,
    leadTimeMax: input.leadTimeMax ?? 15,
    leadTimeUnit: input.leadTimeUnit?.trim() || 'business_days',
    lifecycleStatus: (input.lifecycleStatus ?? 'active') as ProductLifecycleStatus,
    eolDate: parseDate(input.eolDate),
    lastTimeBuyDate: parseDate(input.lastTimeBuyDate),
    efficiencyClass: normalizeText(input.efficiencyClass),
    payload: normalizedPayload,
  };
}

function pickPrimaryTranslation(translations: TranslationRow[], preferredLocale?: string) {
  if (!translations.length) return null;
  if (preferredLocale) {
    const match = translations.find((item) => item.locale.toLowerCase() === preferredLocale.toLowerCase());
    if (match) return match;
  }
  const sorted = [...translations].sort((left, right) => {
    const leftPriority = left.locale.toLowerCase().startsWith('en') ? 0 : 1;
    const rightPriority = right.locale.toLowerCase().startsWith('en') ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function normalizeTranslationRow(product: ProductRow, translation: TranslationRow): AdminProductTranslation | null {
  const payload = payloadSchema.safeParse(translation.payload ?? defaultProductPayload());
  if (!payload.success) return null;

  return {
    id: translation.id,
    productId: product.id,
    locale: translation.locale,
    name: translation.name,
    slug: translation.slug,
    shortDescription: translation.shortDescription,
    description: translation.description,
    descriptionLong: translation.descriptionLong,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    price: translation.price ?? '0',
    compareAtPrice: translation.compareAtPrice,
    currencyCode: translation.currencyCode,
    stockQuantity: translation.stockQuantity,
    moq: translation.moq,
    leadTimeMin: translation.leadTimeMin,
    leadTimeMax: translation.leadTimeMax,
    leadTimeUnit: translation.leadTimeUnit,
    lifecycleStatus: translation.lifecycleStatus as ProductLifecycleStatus,
    eolDate: translation.eolDate ? translation.eolDate.toISOString() : null,
    lastTimeBuyDate: translation.lastTimeBuyDate ? translation.lastTimeBuyDate.toISOString() : null,
    efficiencyClass: translation.efficiencyClass,
    payload: normalizePayload(payload.data as AdminProductPayload),
    spu: product.spu,
    brandId: product.brandId,
    defaultCategoryId: product.defaultCategoryId,
    purchaseMode: product.purchaseMode as ProductPurchaseMode,
    paidSampleEnabled: product.paidSampleEnabled,
    featured: product.featured,
    featuredSortOrder: product.featuredSortOrder,
    hasMultipleSpecs: product.hasMultipleSpecs,
    status: (product.status === 'active' || product.status === 'inactive' ? product.status : 'inactive') as ProductStatus,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(product.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : product.updatedAt.toISOString(),
  };
}

function toListItem(
  product: ProductRow,
  translations: TranslationRow[],
  brandName: string | null,
  categoryName: string | null,
  preferredLocale?: string,
  featureCount = 0,
  categoryIds?: string[],
): AdminProductListItem | null {
  const primary = pickPrimaryTranslation(translations, preferredLocale);
  if (!primary) return null;
  const payload = normalizePayload((primary.payload ?? defaultProductPayload()) as AdminProductPayload);

  return {
    id: product.id,
    name: primary.name,
    slug: primary.slug,
    spu: product.spu,
    coverUrl: payload.coverUrl,
    purchaseMode: product.purchaseMode as ProductPurchaseMode,
    stockQuantity: primary.stockQuantity,
    price: primary.price ?? '0',
    currencyCode: primary.currencyCode,
    status: (product.status === 'active' || product.status === 'inactive' ? product.status : 'inactive') as ProductStatus,
    lifecycleStatus: primary.lifecycleStatus as ProductLifecycleStatus,
    brandId: product.brandId,
    brandName,
    defaultCategoryId: product.defaultCategoryId,
    categoryIds: categoryIds ?? (product.defaultCategoryId ? [product.defaultCategoryId] : []),
    categoryName,
    featured: product.featured,
    paidSampleEnabled: product.paidSampleEnabled,
    hasMultipleSpecs: product.hasMultipleSpecs,
    featureCount,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function loadTranslationsByProductIds(productIds: string[]) {
  if (!productIds.length) return new Map<string, TranslationRow[]>();

  const rows = await db
    .select()
    .from(productTranslations)
    .where(inArray(productTranslations.productId, productIds))
    .orderBy(asc(productTranslations.locale));

  const grouped = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.productId) ?? [];
    bucket.push(row);
    grouped.set(row.productId, bucket);
  }
  return grouped;
}

async function findProductIdsBySearch(keyword: string) {
  const pattern = `%${keyword.trim()}%`;
  const translationMatches = await db
    .selectDistinct({ productId: productTranslations.productId })
    .from(productTranslations)
    .where(or(
      ilike(productTranslations.name, pattern),
      ilike(productTranslations.slug, pattern),
      ilike(productTranslations.shortDescription, pattern),
      ilike(productTranslations.seoTitle, pattern),
      ilike(productTranslations.seoDescription, pattern),
      sql`${productTranslations.payload} ->> 'tags' ILIKE ${pattern}`,
    ));

  const spuMatches = await db
    .selectDistinct({ id: products.id })
    .from(products)
    .where(ilike(products.spu, pattern));

  const ids = new Set<string>();
  for (const row of translationMatches) ids.add(row.productId);
  for (const row of spuMatches) ids.add(row.id);
  return Array.from(ids);
}

async function findProductIdsByTranslationFilters(query: ProductListQuery) {
  const conditions = [];

  if (query.lifecycle) {
    conditions.push(eq(productTranslations.lifecycleStatus, query.lifecycle));
  }
  if (query.currency) {
    conditions.push(eq(productTranslations.currencyCode, query.currency));
  }
  if (query.priceMin) {
    const min = Number(query.priceMin);
    if (Number.isFinite(min)) conditions.push(gte(productTranslations.price, min.toFixed(2)));
  }
  if (query.priceMax) {
    const max = Number(query.priceMax);
    if (Number.isFinite(max)) conditions.push(lte(productTranslations.price, max.toFixed(2)));
  }

  if (!conditions.length) return undefined;

  const rows = await db
    .selectDistinct({ productId: productTranslations.productId })
    .from(productTranslations)
    .where(and(...conditions));

  return rows.map((row) => row.productId);
}

function buildProductWhere(query: ProductListQuery, matchingIds?: string[], translationFilterIds?: string[]) {
  const conditions = [];

  if (matchingIds?.length) {
    conditions.push(inArray(products.id, matchingIds));
  } else if (matchingIds && !matchingIds.length) {
    return null;
  }

  if (translationFilterIds?.length) {
    conditions.push(inArray(products.id, translationFilterIds));
  } else if (translationFilterIds && !translationFilterIds.length) {
    return null;
  }

  if (query.brandId) conditions.push(eq(products.brandId, query.brandId));
  if (query.categoryId) conditions.push(eq(products.defaultCategoryId, query.categoryId));
  if (query.purchaseMode) conditions.push(eq(products.purchaseMode, query.purchaseMode));
  if (query.paidSample === 'true') conditions.push(eq(products.paidSampleEnabled, true));
  if (query.paidSample === 'false') conditions.push(eq(products.paidSampleEnabled, false));
  if (query.status) conditions.push(eq(products.status, query.status));

  return conditions.length ? and(...conditions) : undefined;
}

export type AdminProductListPage = {
  items: AdminProductListItem[];
  total: number;
  activeCount: number;
  page: number;
  pageSize: AdminListPageSize;
};

export async function getAdminProductStats() {
  const [totalRow] = await db.select({ value: count() }).from(products);
  const [activeRow] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.status, 'active'));

  return {
    total: Number(totalRow?.value ?? 0),
    activeCount: Number(activeRow?.value ?? 0),
  };
}

export async function getAdminProductsPaginated(query: ProductListQuery): Promise<AdminProductListPage> {
  const page = Math.max(1, query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const keyword = query.keyword?.trim() ?? '';

  const matchingIds = keyword ? await findProductIdsBySearch(keyword) : undefined;
  const translationFilterIds = await findProductIdsByTranslationFilters(query);
  const whereClause = buildProductWhere(query, matchingIds, translationFilterIds);

  if (whereClause === null) {
    const stats = await getAdminProductStats();
    return { items: [], total: 0, activeCount: stats.activeCount, page, pageSize };
  }

  const [totalRow] = await db.select({ value: count() }).from(products).where(whereClause ?? undefined);
  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const productRows = await db
    .select({
      product: products,
      brandName: brandNameSql(brands.id),
      categoryName: categoryNameSql(categories.id),
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.defaultCategoryId, categories.id))
    .where(whereClause ?? undefined)
    .orderBy(desc(products.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const translationMap = await loadTranslationsByProductIds(productRows.map((row) => row.product.id));
  const featureCountMap = await countProductFeatureAssignmentsByProductIds(productRows.map((row) => row.product.id));
  const stats = await getAdminProductStats();

  const items = productRows
    .map(({ product, brandName, categoryName }) => toListItem(
      product,
      translationMap.get(product.id) ?? [],
      brandName,
      categoryName,
      query.locale || undefined,
      featureCountMap.get(product.id) ?? 0,
    ))
    .filter((item): item is AdminProductListItem => Boolean(item));

  return { items, total, activeCount: stats.activeCount, page, pageSize };
}

export async function getAdminProductListItem(productId: string, preferredLocale?: string) {
  const [row] = await db
    .select({
      product: products,
      brandName: brandNameSql(brands.id),
      categoryName: categoryNameSql(categories.id),
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.defaultCategoryId, categories.id))
    .where(eq(products.id, productId))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select()
    .from(productTranslations)
    .where(eq(productTranslations.productId, productId))
    .orderBy(asc(productTranslations.locale));

  const categoryIdRows = await loadProductCategoryIds(productId);
  const categoryIds = categoryIdRows.length
    ? categoryIdRows
    : (row.product.defaultCategoryId ? [row.product.defaultCategoryId] : []);

  const featureCountMap = await countProductFeatureAssignmentsByProductIds([productId]);
  return toListItem(
    row.product,
    translations,
    row.brandName,
    row.categoryName,
    preferredLocale,
    featureCountMap.get(productId) ?? 0,
    categoryIds,
  );
}

export async function getAdminProductTranslations(productId: string) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return [];

  const translations = await db
    .select()
    .from(productTranslations)
    .where(eq(productTranslations.productId, productId))
    .orderBy(asc(productTranslations.locale));

  return translations
    .map((translation) => normalizeTranslationRow(product, translation))
    .filter((item): item is AdminProductTranslation => Boolean(item));
}

export async function getAdminProductTranslation(translationId: string) {
  const [row] = await db
    .select({ product: products, translation: productTranslations })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(eq(productTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.product, row.translation) : null;
}

export async function findAdminProductTranslationBySlug(
  slug: string,
  locale?: string,
  excludeTranslationId?: string,
) {
  const normalizedSlug = normalizeProductSlug(slug);
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(productTranslations.slug, normalizedSlug),
    eq(productTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(productTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ product: products, translation: productTranslations })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.product, row.translation) : null;
}

export async function findAdminProductTranslationByProductAndLocale(
  productId: string,
  locale: string,
  excludeTranslationId?: string,
) {
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(productTranslations.productId, productId),
    eq(productTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(productTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ product: products, translation: productTranslations })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.product, row.translation) : null;
}

export async function findAdminProductBySpu(spu: string, excludeProductId?: string) {
  const conditions = [eq(products.spu, spu.trim())];
  if (excludeProductId) conditions.push(ne(products.id, excludeProductId));

  const [row] = await db.select().from(products).where(and(...conditions)).limit(1);
  return row ?? null;
}

export async function createAdminProductTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  if (input.productId) {
    const existingLocale = await findAdminProductTranslationByProductAndLocale(input.productId, next.locale);
    if (existingLocale) {
      return updateAdminProductTranslation(existingLocale.id, input);
    }
  }

  const duplicateSpu = await findAdminProductBySpu(next.spu, input.productId);
  if (duplicateSpu) throw new Error('DUPLICATE_SPU');

  const duplicateSlug = await findAdminProductTranslationBySlug(next.slug, next.locale);
  if (duplicateSlug) throw new Error('SLUG_CONFLICT');

  const productId = input.productId
    ? input.productId
    : (await db
      .insert(products)
      .values({
        spu: next.spu,
        brandId: next.brandId,
        defaultCategoryId: next.defaultCategoryId,
        purchaseMode: next.purchaseMode,
        paidSampleEnabled: next.paidSampleEnabled,
        featured: next.featured,
        featuredSortOrder: next.featuredSortOrder,
        status: next.status,
      })
      .returning({ id: products.id }))[0]?.id;

  if (!productId) return null;

  if (input.productId) {
    await db
      .update(products)
      .set({
        spu: next.spu,
        brandId: next.brandId,
        defaultCategoryId: next.defaultCategoryId,
        purchaseMode: next.purchaseMode,
        paidSampleEnabled: next.paidSampleEnabled,
        featured: next.featured,
        featuredSortOrder: next.featuredSortOrder,
        status: next.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  await syncProductCategories(productId, next.categoryIds);

  const [translation] = await db
    .insert(productTranslations)
    .values({
      productId,
      locale: next.locale,
      name: next.name,
      slug: next.slug,
      shortDescription: next.shortDescription,
      description: next.description,
      descriptionLong: next.descriptionLong,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      price: next.price.toFixed(2),
      compareAtPrice: next.compareAtPrice == null ? null : next.compareAtPrice.toFixed(2),
      currencyCode: next.currencyCode,
      stockQuantity: next.stockQuantity,
      moq: next.moq,
      leadTimeMin: next.leadTimeMin,
      leadTimeMax: next.leadTimeMax,
      leadTimeUnit: next.leadTimeUnit,
      lifecycleStatus: next.lifecycleStatus,
      eolDate: next.eolDate,
      lastTimeBuyDate: next.lastTimeBuyDate,
      efficiencyClass: next.efficiencyClass,
      payload: next.payload,
    })
    .returning();

  if (!translation) return null;

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return null;

  return normalizeTranslationRow(product, translation);
}

export async function updateAdminProductTranslation(translationId: string, input: TranslationPatchInput) {
  const existing = await getAdminProductTranslation(translationId);
  if (!existing) return null;

  const merged = adminProductTranslationSchema.parse({
    productId: existing.productId,
    locale: existing.locale,
    spu: existing.spu,
    brandId: existing.brandId,
    defaultCategoryId: existing.defaultCategoryId,
    purchaseMode: existing.purchaseMode,
    paidSampleEnabled: existing.paidSampleEnabled,
    featured: existing.featured,
    featuredSortOrder: existing.featuredSortOrder,
    status: existing.status,
    name: existing.name,
    slug: existing.slug,
    shortDescription: existing.shortDescription,
    description: existing.description,
    descriptionLong: existing.descriptionLong,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    price: Number(existing.price),
    compareAtPrice: existing.compareAtPrice == null ? null : Number(existing.compareAtPrice),
    currencyCode: existing.currencyCode,
    stockQuantity: existing.stockQuantity,
    moq: existing.moq,
    leadTimeMin: existing.leadTimeMin,
    leadTimeMax: existing.leadTimeMax,
    leadTimeUnit: existing.leadTimeUnit,
    lifecycleStatus: existing.lifecycleStatus,
    eolDate: existing.eolDate,
    lastTimeBuyDate: existing.lastTimeBuyDate,
    efficiencyClass: existing.efficiencyClass,
    payload: existing.payload,
    ...input,
  });

  const next = sanitizeTranslationInput(merged);

  const duplicateSpu = await findAdminProductBySpu(next.spu, existing.productId);
  if (duplicateSpu) throw new Error('DUPLICATE_SPU');

  const duplicateSlug = await findAdminProductTranslationBySlug(next.slug, next.locale, translationId);
  if (duplicateSlug) throw new Error('SLUG_CONFLICT');

  await db
    .update(products)
    .set({
      spu: next.spu,
      brandId: next.brandId,
      defaultCategoryId: next.defaultCategoryId,
      purchaseMode: next.purchaseMode,
      paidSampleEnabled: next.paidSampleEnabled,
      featured: next.featured,
      featuredSortOrder: next.featuredSortOrder,
      status: next.status,
      updatedAt: new Date(),
    })
    .where(eq(products.id, existing.productId));

  await syncProductCategories(existing.productId, next.categoryIds);

  const [translation] = await db
    .update(productTranslations)
    .set({
      name: next.name,
      slug: next.slug,
      shortDescription: next.shortDescription,
      description: next.description,
      descriptionLong: next.descriptionLong,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      price: next.price.toFixed(2),
      compareAtPrice: next.compareAtPrice == null ? null : next.compareAtPrice.toFixed(2),
      currencyCode: next.currencyCode,
      stockQuantity: next.stockQuantity,
      moq: next.moq,
      leadTimeMin: next.leadTimeMin,
      leadTimeMax: next.leadTimeMax,
      leadTimeUnit: next.leadTimeUnit,
      lifecycleStatus: next.lifecycleStatus,
      eolDate: next.eolDate,
      lastTimeBuyDate: next.lastTimeBuyDate,
      efficiencyClass: next.efficiencyClass,
      payload: next.payload,
      updatedAt: new Date(),
    })
    .where(eq(productTranslations.id, translationId))
    .returning();

  if (!translation) return null;

  const [product] = await db.select().from(products).where(eq(products.id, existing.productId)).limit(1);
  if (!product) return null;

  return normalizeTranslationRow(product, translation);
}

export async function updateAdminProductShared(productId: string, input: ProductPatchInput) {
  const parsed = adminProductPatchSchema.parse(input);

  if (parsed.spu) {
    const duplicateSpu = await findAdminProductBySpu(parsed.spu, productId);
    if (duplicateSpu) throw new Error('DUPLICATE_SPU');
  }

  const resolved = resolveCategoryFields(parsed);
  const shouldSyncCategories = parsed.categoryIds !== undefined || parsed.defaultCategoryId !== undefined;
  const { categoryIds: _categoryIds, ...productFields } = parsed;

  const [product] = await db
    .update(products)
    .set({
      ...productFields,
      ...(shouldSyncCategories ? { defaultCategoryId: resolved.defaultCategoryId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
    .returning();

  if (product && shouldSyncCategories) {
    await syncProductCategories(productId, resolved.categoryIds);
  }

  return product ?? null;
}

export async function deleteAdminProduct(productId: string) {
  const [deleted] = await db.delete(products).where(eq(products.id, productId)).returning({ id: products.id });
  return Boolean(deleted);
}

export async function getAdminProducts(search = '') {
  const items = [];
  let page = 1;
  let total = 0;

  do {
    const result = await getAdminProductsPaginated({
      keyword: search,
      page,
      pageSize: 100,
      brandId: '',
      categoryId: '',
      purchaseMode: '',
      paidSample: '',
      status: '',
      lifecycle: '',
      priceMin: '',
      priceMax: '',
      currency: '',
      locale: '',
    });
    items.push(...result.items);
    total = result.total;
    page += 1;
  } while (items.length < total);

  return { items, total };
}

export async function syncProductHasMultipleSpecs(_productId: string) {
  // Reserved for future product spec editor module.
}

export async function getAdminProductOptions() {
  const [brandRows, categoryRows] = await Promise.all([
    getAdminBrandOptions(),
    getAdminCategoryOptions(),
  ]);

  return {
    brands: brandRows,
    categories: categoryRows,
  };
}
