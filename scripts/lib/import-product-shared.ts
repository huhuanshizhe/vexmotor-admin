import { and, eq, inArray } from 'drizzle-orm';

import { type AdminProductPayload } from '@/lib/product-content';
import { resolveSlugForSave } from '@/lib/slug';
import { db } from '@/server/db';
import {
  brandTranslations,
  categories,
  categoryTranslations,
  productCategories,
  productTranslations,
  products,
} from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

export const IMPORT_DEFAULT_LOCALE = DEFAULT_PRODUCT_LOCALE;

export const CATEGORY_SLUGS = [
  'nema-8-stepper-motor',
  'nema-11-stepper-motor',
  'nema-14-stepper-motor',
  'nema-16-stepper-motor',
  'nema-17-stepper-motor',
  'nema-23-stepper-motor',
  'nema-24-stepper-motor',
  'nema-34-stepper-motor',
  'power-supply',
  'stepper-motor-driver',
  'closed-loop-stepper-motor',
  'brushless-spindle-motor',
  'brushless-dc-motor',
  'integrated-stepper-motor',
] as const;

export type CrawlAttachment = {
  url: string;
  label: string;
  mimeType: string;
};

export type CrawlProduct = {
  sourceUrl: string;
  canonicalUrl: string;
  prestashopProductId: string | null;
  categorySlug: string;
  name: string;
  spu: string;
  price: string;
  currency: string;
  shortDescription: string | null;
  descriptionLong: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  galleryImages: string[];
  attachments: CrawlAttachment[];
  error: string | null;
};

export function normalizeImportText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeImportSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeImportText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildCrawlProductPayload(product: CrawlProduct): AdminProductPayload {
  const coverUrl = product.galleryImages[0] ?? null;
  const gallery = product.galleryImages.slice(coverUrl ? 1 : 0).map((url) => ({
    url,
    alt: product.name,
    width: null,
    height: null,
  }));

  return {
    coverUrl,
    coverAlt: coverUrl ? product.name : null,
    gallery,
    tags: [],
    attachments: product.attachments.map((item) => ({
      name: item.label,
      url: item.url,
      mimeType: item.mimeType,
    })),
    certifications: [],
  };
}

export async function loadImportBrandId() {
  if (!db) throw new Error('DATABASE_URL is required');
  const [row] = await db
    .select({ brandId: brandTranslations.brandId })
    .from(brandTranslations)
    .where(and(eq(brandTranslations.slug, 'stepmotech'), eq(brandTranslations.locale, IMPORT_DEFAULT_LOCALE)))
    .limit(1);

  if (!row) {
    throw new Error('未找到 stepmotech 品牌，请先在 admin 中创建 slug=stepmotech 的品牌');
  }

  return row.brandId;
}

export async function loadImportCategoryIdBySlug() {
  if (!db) throw new Error('DATABASE_URL is required');
  const rows = await db
    .select({
      categoryId: categories.id,
      slug: categoryTranslations.slug,
    })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(and(eq(categoryTranslations.locale, IMPORT_DEFAULT_LOCALE), inArray(categoryTranslations.slug, [...CATEGORY_SLUGS])));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.slug, row.categoryId);
  }

  for (const slug of CATEGORY_SLUGS) {
    if (!map.has(slug)) {
      throw new Error(`未找到分类 slug=${slug}，请先执行 pnpm db:import-categories`);
    }
  }

  return map;
}

async function findProductBySpu(spu: string) {
  if (!db) throw new Error('DATABASE_URL is required');
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.spu, spu))
    .limit(1);
  return row ?? null;
}

async function findTranslationBySlug(slug: string, excludeProductId?: string) {
  if (!db) throw new Error('DATABASE_URL is required');
  const rows = await db
    .select({
      translationId: productTranslations.id,
      productId: productTranslations.productId,
    })
    .from(productTranslations)
    .where(and(eq(productTranslations.slug, slug), eq(productTranslations.locale, IMPORT_DEFAULT_LOCALE)));

  return rows.find((row) => row.productId !== excludeProductId) ?? null;
}

async function resolveUniqueSlug(name: string, excludeProductId?: string) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await findTranslationBySlug(candidate, excludeProductId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function upsertCrawlProduct(
  product: CrawlProduct,
  brandId: string,
  categoryIdBySlug: Map<string, string>,
) {
  if (!db) throw new Error('DATABASE_URL is required');
  if (product.error) {
    throw new Error(product.error);
  }

  const categoryId = categoryIdBySlug.get(product.categorySlug);
  if (!categoryId) {
    throw new Error(`Unknown category slug: ${product.categorySlug}`);
  }

  const spu = product.spu.trim();
  const existing = await findProductBySpu(spu);
  const slug = await resolveUniqueSlug(product.name, existing?.id);
  const payload = buildCrawlProductPayload(product);
  const now = new Date();

  const translationValues = {
    locale: IMPORT_DEFAULT_LOCALE,
    name: product.name.trim(),
    slug,
    shortDescription: normalizeImportText(product.shortDescription),
    description: normalizeImportText(product.descriptionLong),
    seoTitle: normalizeImportSeoText(product.seoTitle ?? product.name, 255),
    seoDescription: normalizeImportSeoText(product.seoDescription ?? product.shortDescription, 500),
    price: product.price,
    compareAtPrice: null,
    currencyCode: (product.currency || 'USD').trim().toUpperCase(),
    stockQuantity: 0,
    moq: 1,
    leadTimeMin: 3,
    leadTimeMax: 15,
    leadTimeUnit: 'business_days',
    lifecycleStatus: 'active' as const,
    payload,
    updatedAt: now,
  };

  if (existing) {
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          brandId,
          defaultCategoryId: categoryId,
          purchaseMode: 'buy',
          paidSampleEnabled: false,
          featured: false,
          featuredSortOrder: 0,
          status: 'active',
          hasMultipleSpecs: false,
          updatedAt: now,
        })
        .where(eq(products.id, existing.id));

      const [translation] = await tx
        .select({ id: productTranslations.id })
        .from(productTranslations)
        .where(and(eq(productTranslations.productId, existing.id), eq(productTranslations.locale, IMPORT_DEFAULT_LOCALE)))
        .limit(1);

      if (translation) {
        await tx
          .update(productTranslations)
          .set(translationValues)
          .where(eq(productTranslations.id, translation.id));
      } else {
        await tx.insert(productTranslations).values({
          productId: existing.id,
          ...translationValues,
        });
      }

      await tx.delete(productCategories).where(eq(productCategories.productId, existing.id));
      await tx.insert(productCategories).values({ productId: existing.id, categoryId });
    });

    return { result: 'updated' as const, productId: existing.id };
  }

  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        spu,
        brandId,
        defaultCategoryId: categoryId,
        purchaseMode: 'buy',
        paidSampleEnabled: false,
        featured: false,
        featuredSortOrder: 0,
        status: 'active',
        hasMultipleSpecs: false,
      })
      .returning({ id: products.id });

    if (!created) {
      throw new Error(`Failed to create product: ${spu}`);
    }

    await tx.insert(productTranslations).values({
      productId: created.id,
      ...translationValues,
    });

    await tx.insert(productCategories).values({
      productId: created.id,
      categoryId,
    });

    return created.id;
  });

  return { result: 'created' as const, productId: createdId };
}

export async function deleteProductBySpu(spu: string) {
  if (!db) throw new Error('DATABASE_URL is required');
  const [deleted] = await db.delete(products).where(eq(products.spu, spu)).returning({ id: products.id });
  return deleted?.id ?? null;
}

export async function findProductIdBySpu(spu: string) {
  const row = await findProductBySpu(spu);
  return row?.id ?? null;
}
