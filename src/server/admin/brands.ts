import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import {
  type AdminBrandListItem,
  type AdminBrandPayload,
  type AdminBrandTranslation,
  type BrandStatus,
  brandStatuses,
} from '@/lib/brand-content';
import { db } from '@/server/db';
import { brandTranslations, brands, products } from '@/server/db/schema';
import { DEFAULT_BRAND_LOCALE, normalizeBrandSlug } from '@/server/brands/resolve-brand-translation';

const payloadSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const adminBrandTranslationSchema = z.object({
  brandId: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  locale: z.string().trim().min(2).default(DEFAULT_BRAND_LOCALE),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  logoUrl: z.string().trim().nullable().optional(),
  websiteUrl: z.string().trim().nullable().optional(),
  status: z.enum(brandStatuses).optional(),
  payload: payloadSchema.default({ tags: [] }),
});

export const adminBrandTranslationPatchSchema = adminBrandTranslationSchema.partial();

export const adminBrandPatchSchema = z.object({
  logoUrl: z.string().trim().nullable().optional(),
  websiteUrl: z.string().trim().nullable().optional(),
  status: z.enum(brandStatuses).optional(),
});

type TranslationCreateInput = z.infer<typeof adminBrandTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminBrandTranslationPatchSchema>;
type BrandPatchInput = z.infer<typeof adminBrandPatchSchema>;

type BrandRow = typeof brands.$inferSelect;
type TranslationRow = typeof brandTranslations.$inferSelect;

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
  return value?.trim() || DEFAULT_BRAND_LOCALE;
}

function normalizePayload(payload: AdminBrandPayload): AdminBrandPayload {
  return {
    tags: payload.tags.map((value) => value.trim()).filter(Boolean),
  };
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const normalizedName = input.name.trim();
  const normalizedDescription = normalizeText(input.description);
  const normalizedPayload = normalizePayload(input.payload ?? { tags: [] });
  const normalizedSlug = input.slug?.trim()
    ? normalizeBrandSlug(input.slug)
    : normalizeBrandSlug(normalizedName);

  return {
    name: normalizedName,
    slug: normalizedSlug || `brand-${Date.now()}`,
    description: normalizedDescription,
    locale: normalizeLocale(input.locale),
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedName, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? normalizedDescription, 160),
    payload: normalizedPayload,
    logoUrl: normalizeText(input.logoUrl),
    websiteUrl: normalizeText(input.websiteUrl),
    status: input.status ?? 'active' as BrandStatus,
  };
}

function pickPrimaryTranslation(translations: TranslationRow[]) {
  if (!translations.length) return null;
  const sorted = [...translations].sort((left, right) => {
    const leftPriority = left.locale.toLowerCase().startsWith('en') ? 0 : 1;
    const rightPriority = right.locale.toLowerCase().startsWith('en') ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function normalizeTranslationRow(brand: BrandRow, translation: TranslationRow): AdminBrandTranslation | null {
  const payload = payloadSchema.safeParse(translation.payload ?? { tags: [] });
  if (!payload.success) return null;

  return {
    id: translation.id,
    brandId: brand.id,
    locale: translation.locale,
    name: translation.name,
    slug: translation.slug,
    description: translation.description,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    logoUrl: brand.logoUrl,
    websiteUrl: brand.websiteUrl,
    status: brand.status,
    payload: normalizePayload(payload.data),
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(brand.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : brand.updatedAt.toISOString(),
  };
}

async function loadProductCounts(brandIds: string[]) {
  const map = new Map<string, number>();
  if (!brandIds.length) return map;

  const rows = await db
    .select({ brandId: products.brandId, value: count() })
    .from(products)
    .where(inArray(products.brandId, brandIds))
    .groupBy(products.brandId);

  for (const row of rows) {
    if (row.brandId) {
      map.set(row.brandId, Number(row.value ?? 0));
    }
  }
  return map;
}

function toListItem(
  brand: BrandRow,
  translations: TranslationRow[],
  productCount: number,
): AdminBrandListItem | null {
  const primary = pickPrimaryTranslation(translations);
  if (!primary) return null;

  return {
    id: brand.id,
    name: primary.name,
    slug: primary.slug,
    description: primary.description,
    logoUrl: brand.logoUrl,
    websiteUrl: brand.websiteUrl,
    status: brand.status,
    productCount,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}

async function loadTranslationsByBrandIds(brandIds: string[]) {
  if (!brandIds.length) return new Map<string, TranslationRow[]>();

  const rows = await db
    .select()
    .from(brandTranslations)
    .where(inArray(brandTranslations.brandId, brandIds))
    .orderBy(asc(brandTranslations.locale));

  const grouped = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.brandId) ?? [];
    bucket.push(row);
    grouped.set(row.brandId, bucket);
  }
  return grouped;
}

async function findBrandIdsBySearch(search: string) {
  const pattern = `%${search.trim()}%`;
  const rows = await db
    .selectDistinct({ brandId: brandTranslations.brandId })
    .from(brandTranslations)
    .where(or(
      ilike(brandTranslations.name, pattern),
      ilike(brandTranslations.slug, pattern),
      ilike(brandTranslations.description, pattern),
      ilike(brandTranslations.seoTitle, pattern),
      ilike(brandTranslations.seoDescription, pattern),
      sql`${brandTranslations.payload} ->> 'tags' ILIKE ${pattern}`,
    ));

  return rows.map((row) => row.brandId);
}

export type AdminBrandListQuery = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type AdminBrandListPage = {
  items: AdminBrandListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

export async function getAdminBrandsPaginated(
  options: AdminBrandListQuery = {},
): Promise<AdminBrandListPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const keyword = options.keyword?.trim() ?? '';

  const matchingIds = keyword ? await findBrandIdsBySearch(keyword) : undefined;
  if (keyword && !matchingIds?.length) {
    return { items: [], total: 0, page, pageSize };
  }

  const whereClause = matchingIds?.length
    ? inArray(brands.id, matchingIds)
    : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(brands)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const brandRows = await db
    .select()
    .from(brands)
    .where(whereClause)
    .orderBy(desc(brands.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const translationMap = await loadTranslationsByBrandIds(brandRows.map((row) => row.id));
  const productCounts = await loadProductCounts(brandRows.map((row) => row.id));

  const items = brandRows
    .map((brand) => toListItem(
      brand,
      translationMap.get(brand.id) ?? [],
      productCounts.get(brand.id) ?? 0,
    ))
    .filter((item): item is AdminBrandListItem => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));

  return { items, total, page, pageSize };
}

export async function getAdminBrands(search?: string) {
  const result = await getAdminBrandsPaginated({
    keyword: search,
    page: 1,
    pageSize: 10000,
  });
  return result.items;
}

export async function getAdminBrandListItem(brandId: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) return null;

  const translations = await db
    .select()
    .from(brandTranslations)
    .where(eq(brandTranslations.brandId, brandId))
    .orderBy(asc(brandTranslations.locale));

  const productCounts = await loadProductCounts([brandId]);
  return toListItem(brand, translations, productCounts.get(brandId) ?? 0);
}

export async function getAdminBrandTranslations(brandId: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) return [];

  const translations = await db
    .select()
    .from(brandTranslations)
    .where(eq(brandTranslations.brandId, brandId))
    .orderBy(asc(brandTranslations.locale));

  return translations
    .map((translation) => normalizeTranslationRow(brand, translation))
    .filter((item): item is AdminBrandTranslation => Boolean(item));
}

export async function getAdminBrandTranslation(translationId: string) {
  const [row] = await db
    .select({ brand: brands, translation: brandTranslations })
    .from(brandTranslations)
    .innerJoin(brands, eq(brands.id, brandTranslations.brandId))
    .where(eq(brandTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.brand, row.translation) : null;
}

export async function findAdminBrandTranslationBySlug(
  slug: string,
  locale?: string,
  excludeTranslationId?: string,
) {
  const normalizedSlug = normalizeBrandSlug(slug);
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(brandTranslations.slug, normalizedSlug),
    eq(brandTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(brandTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ brand: brands, translation: brandTranslations })
    .from(brandTranslations)
    .innerJoin(brands, eq(brands.id, brandTranslations.brandId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.brand, row.translation) : null;
}

export async function findAdminBrandTranslationByBrandAndLocale(
  brandId: string,
  locale: string,
  excludeTranslationId?: string,
) {
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(brandTranslations.brandId, brandId),
    eq(brandTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(brandTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ brand: brands, translation: brandTranslations })
    .from(brandTranslations)
    .innerJoin(brands, eq(brands.id, brandTranslations.brandId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.brand, row.translation) : null;
}

export async function createAdminBrandTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  if (input.brandId) {
    const existingLocale = await findAdminBrandTranslationByBrandAndLocale(input.brandId, next.locale);
    if (existingLocale) {
      return updateAdminBrandTranslation(existingLocale.id, input);
    }
  }

  const brandId = input.brandId
    ? input.brandId
    : (await db
      .insert(brands)
      .values({
        logoUrl: next.logoUrl,
        websiteUrl: next.websiteUrl,
        status: next.status,
      })
      .returning({ id: brands.id }))[0]?.id;

  if (!brandId) return null;

  if (input.brandId) {
    await db
      .update(brands)
      .set({
        logoUrl: next.logoUrl ?? undefined,
        websiteUrl: next.websiteUrl ?? undefined,
        status: next.status,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));
  }

  const [created] = await db
    .insert(brandTranslations)
    .values({
      brandId,
      locale: next.locale,
      name: next.name,
      slug: next.slug,
      description: next.description,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      payload: next.payload,
    })
    .returning();

  if (!created) return null;

  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  return brand ? normalizeTranslationRow(brand, created) : null;
}

export async function updateAdminBrandTranslation(translationId: string, input: TranslationPatchInput) {
  const current = await getAdminBrandTranslation(translationId);
  if (!current) return null;

  const merged = sanitizeTranslationInput({
    brandId: current.brandId,
    name: input.name ?? current.name,
    slug: input.slug ?? current.slug,
    description: input.description === undefined ? current.description : input.description,
    locale: input.locale ?? current.locale,
    seoTitle: input.seoTitle === undefined ? current.seoTitle : input.seoTitle,
    seoDescription: input.seoDescription === undefined ? current.seoDescription : input.seoDescription,
    logoUrl: input.logoUrl === undefined ? current.logoUrl : input.logoUrl,
    websiteUrl: input.websiteUrl === undefined ? current.websiteUrl : input.websiteUrl,
    status: input.status ?? current.status,
    payload: input.payload ?? current.payload,
  });

  await db
    .update(brands)
    .set({
      logoUrl: merged.logoUrl,
      websiteUrl: merged.websiteUrl,
      status: merged.status,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, current.brandId));

  const [updated] = await db
    .update(brandTranslations)
    .set({
      locale: merged.locale,
      name: merged.name,
      slug: merged.slug,
      description: merged.description,
      seoTitle: merged.seoTitle,
      seoDescription: merged.seoDescription,
      payload: merged.payload,
      updatedAt: new Date(),
    })
    .where(eq(brandTranslations.id, translationId))
    .returning();

  if (!updated) return null;

  const [brand] = await db.select().from(brands).where(eq(brands.id, current.brandId)).limit(1);
  return brand ? normalizeTranslationRow(brand, updated) : null;
}

export async function updateAdminBrand(brandId: string, input: BrandPatchInput) {
  const current = await getAdminBrandListItem(brandId);
  if (!current) return null;

  const [updated] = await db
    .update(brands)
    .set({
      logoUrl: input.logoUrl === undefined ? current.logoUrl : input.logoUrl,
      websiteUrl: input.websiteUrl === undefined ? current.websiteUrl : input.websiteUrl,
      status: input.status ?? current.status,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, brandId))
    .returning();

  if (!updated) return null;

  const translations = await db
    .select()
    .from(brandTranslations)
    .where(eq(brandTranslations.brandId, brandId));

  const productCounts = await loadProductCounts([brandId]);
  return toListItem(updated, translations, productCounts.get(brandId) ?? 0);
}

export async function deleteAdminBrand(brandId: string) {
  const [deleted] = await db.delete(brands).where(eq(brands.id, brandId)).returning({ id: brands.id });
  return Boolean(deleted);
}

export async function getAdminBrandOptions() {
  const rows = await getAdminBrands();
  return rows.map((item) => ({ value: item.id, label: item.name }));
}

/** @deprecated use getAdminBrandListItem */
export async function getAdminBrand(id: string) {
  return getAdminBrandListItem(id);
}
