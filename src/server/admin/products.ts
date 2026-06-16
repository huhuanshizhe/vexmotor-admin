import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';

import {
  createMemoryProduct,
  deleteMemoryProduct,
  getMemoryProduct,
  listMemoryBrands,
  listMemoryCategories,
  listMemoryProducts,
  updateMemoryProduct,
} from '@/server/admin/memory-store';
import { db } from '@/server/db';
import { attachments, brands, categories, productFeatures, productImages, productRelations, products } from '@/server/db/schema';

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  purchaseMode: 'buy' | 'inquiry';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  stockQuantity: number;
  moq: number;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  lifecycleStatus: string;
  eolDate: string | null;
  lastTimeBuyDate: string | null;
  efficiencyClass: string | null;
  certifications: string[] | null;
  configurationRules: unknown | null;
  torqueCurveData: unknown | null;
  paidSampleEnabled: boolean;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  featured: boolean;
  brandId: string | null;
  defaultCategoryId: string | null;
  brandName: string | null;
  categoryName: string | null;
};

export type AdminProductDetail = AdminProductRow & {
  seoTitle: string | null;
  seoDescription: string | null;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
    isPrimary: boolean;
  }>;
  features: Array<{
    id: string;
    featureKey: string;
    featureValue: string;
    featureValueMin: number | null;
    featureValueMax: number | null;
    valueType: string;
    conditionalValue: Record<string, unknown> | null;
    unit: string | null;
    specCategory: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;
  compatibleProducts: Array<{
    id: string;
    relatedProductId: string;
    relatedProductName: string;
    relatedProductSku: string;
    relationType: 'drivers' | 'mechanical-integration' | 'power-control' | 'custom';
    relationLabel: string | null;
    sortOrder: number;
  }>;
};

export type AdminProductInput = {
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description?: string | null;
  purchaseMode: 'buy' | 'inquiry';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  price: number;
  compareAtPrice?: number | null;
  currencyCode: string;
  stockQuantity: number;
  moq?: number;
  leadTimeMin?: number;
  leadTimeMax?: number;
  leadTimeUnit?: string;
  lifecycleStatus?: string;
  eolDate?: string | null;
  lastTimeBuyDate?: string | null;
  efficiencyClass?: string | null;
  certifications?: string[];
  configurationRules?: unknown | null;
  torqueCurveData?: unknown | null;
  paidSampleEnabled?: boolean;
  featured: boolean;
  brandId?: string | null;
  defaultCategoryId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images: Array<{
    url: string;
    alt: string;
    width?: number | null;
    height?: number | null;
    isPrimary: boolean;
  }>;
  features: Array<{
    featureKey: string;
    featureValue: string;
    featureValueMin?: number | null;
    featureValueMax?: number | null;
    valueType?: string;
    conditionalValue?: Record<string, unknown> | null;
    unit?: string | null;
    specCategory?: string;
  }>;
  attachments: Array<{
    name: string;
    url: string;
    mimeType: string;
  }>;
  compatibleProducts?: Array<{
    relatedProductId: string;
    relationType: 'drivers' | 'mechanical-integration' | 'power-control' | 'custom';
    relationLabel?: string | null;
    sortOrder?: number;
  }>;
};

function mapMemoryProductRow(id: string): AdminProductDetail | null {
  const product = getMemoryProduct(id);
  if (!product) {
    return null;
  }

  const brandName = product.brandId ? listMemoryBrands().find((item) => item.id === product.brandId)?.name ?? null : null;
  const categoryName = product.defaultCategoryId ? listMemoryCategories().find((item) => item.id === product.defaultCategoryId)?.name ?? null : null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    purchaseMode: product.purchaseMode,
    status: product.status,
    stockQuantity: product.stockQuantity,
    moq: product.moq ?? 1,
    leadTimeMin: product.leadTimeMin ?? 3,
    leadTimeMax: product.leadTimeMax ?? 15,
    leadTimeUnit: product.leadTimeUnit ?? 'business_days',
    lifecycleStatus: product.lifecycleStatus ?? 'active',
    eolDate: product.eolDate ?? null,
    lastTimeBuyDate: product.lastTimeBuyDate ?? null,
    efficiencyClass: product.efficiencyClass ?? null,
    certifications: product.certifications ?? [],
    configurationRules: product.configurationRules ?? null,
    torqueCurveData: product.torqueCurveData ?? null,
    paidSampleEnabled: product.paidSampleEnabled ?? false,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currencyCode: product.currencyCode,
    featured: product.featured,
    brandId: product.brandId,
    defaultCategoryId: product.defaultCategoryId,
    brandName,
    categoryName,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: product.images,
    features: product.features,
    attachments: product.attachments,
    compatibleProducts: product.compatibleProducts ?? [],
  };
}

function toMemoryProductPayload(input: AdminProductInput) {
  return {
    name: input.name,
    slug: input.slug,
    sku: input.sku,
    shortDescription: input.shortDescription ?? null,
    description: input.description ?? null,
    purchaseMode: input.purchaseMode,
    status: input.status,
    price: input.price.toFixed(2),
    compareAtPrice: input.compareAtPrice == null ? null : input.compareAtPrice.toFixed(2),
    currencyCode: input.currencyCode.toUpperCase(),
    stockQuantity: input.stockQuantity,
    moq: input.moq ?? 1,
    leadTimeMin: input.leadTimeMin ?? 3,
    leadTimeMax: input.leadTimeMax ?? 15,
    leadTimeUnit: input.leadTimeUnit ?? 'business_days',
    lifecycleStatus: input.lifecycleStatus ?? 'active',
    eolDate: input.eolDate ?? null,
    lastTimeBuyDate: input.lastTimeBuyDate ?? null,
    efficiencyClass: input.efficiencyClass ?? null,
    certifications: input.certifications ?? [],
    configurationRules: input.configurationRules ?? null,
    torqueCurveData: input.torqueCurveData ?? null,
    paidSampleEnabled: input.paidSampleEnabled ?? false,
    featured: input.featured,
    brandId: input.brandId ?? null,
    defaultCategoryId: input.defaultCategoryId ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    images: input.images.map((item) => ({
      url: item.url,
      alt: item.alt,
      width: item.width ?? null,
      height: item.height ?? null,
      isPrimary: item.isPrimary,
    })),
    features: input.features.map((item) => ({
      featureKey: item.featureKey,
      featureValue: item.featureValue,
      featureValueMin: item.featureValueMin ?? null,
      featureValueMax: item.featureValueMax ?? null,
      valueType: item.valueType || 'text',
      conditionalValue: item.conditionalValue ?? null,
      unit: item.unit ?? null,
      specCategory: item.specCategory || 'general',
    })),
    attachments: input.attachments.map((item) => ({
      name: item.name,
      url: item.url,
      mimeType: item.mimeType,
    })),
    compatibleProducts: (input.compatibleProducts ?? []).map((item, index) => ({
      relatedProductId: item.relatedProductId,
      relationType: item.relationType,
      relationLabel: item.relationLabel ?? null,
      sortOrder: item.sortOrder ?? index + 1,
    })),
  };
}

export async function getAdminProducts(search = '') {
  if (!db) {
    const items = listMemoryProducts(search).map((item) => mapMemoryProductRow(item.id)).filter((item): item is AdminProductDetail => Boolean(item));
    return { items, total: items.length };
  }

  const filters = search
    ? [
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.slug, `%${search}%`),
        )!,
      ]
    : [];

  const where = filters.length ? and(...filters) : undefined;

  try {
    const [items, totals] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          sku: products.sku,
          shortDescription: products.shortDescription,
          description: products.description,
          purchaseMode: products.purchaseMode,
          status: products.status,
          stockQuantity: products.stockQuantity,
          moq: products.moq,
          leadTimeMin: products.leadTimeMin,
          leadTimeMax: products.leadTimeMax,
          leadTimeUnit: products.leadTimeUnit,
          lifecycleStatus: products.lifecycleStatus,
          eolDate: products.eolDate,
          lastTimeBuyDate: products.lastTimeBuyDate,
          efficiencyClass: products.efficiencyClass,
          certifications: products.certifications,
          configurationRules: products.configurationRules,
          torqueCurveData: products.torqueCurveData,
          paidSampleEnabled: products.paidSampleEnabled,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          currencyCode: products.currencyCode,
          featured: products.featured,
          brandId: products.brandId,
          defaultCategoryId: products.defaultCategoryId,
          brandName: brands.name,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(categories, eq(products.defaultCategoryId, categories.id))
        .where(where)
        .orderBy(desc(products.updatedAt), asc(products.name)),
      db.select({ total: count() }).from(products).where(where),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        eolDate: item.eolDate ? item.eolDate.toISOString() : null,
        lastTimeBuyDate: item.lastTimeBuyDate ? item.lastTimeBuyDate.toISOString() : null,
      })),
      total: Number(totals[0]?.total ?? 0),
    };
  } catch {
    const items = listMemoryProducts(search).map((item) => mapMemoryProductRow(item.id)).filter((item): item is AdminProductDetail => Boolean(item));
    return { items, total: items.length };
  }
}

export async function getAdminProductOptions() {
  if (!db) {
    return {
      brands: listMemoryBrands().map((item) => ({ label: item.name, value: item.id })),
      categories: listMemoryCategories().map((item) => ({ label: item.name, value: item.id })),
    };
  }

  try {
    const [brandRows, categoryRows] = await Promise.all([
      db.select({ value: brands.id, label: brands.name }).from(brands).orderBy(asc(brands.name)),
      db.select({ value: categories.id, label: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    ]);

    return {
      brands: brandRows,
      categories: categoryRows,
    };
  } catch {
    return {
      brands: listMemoryBrands().map((item) => ({ label: item.name, value: item.id })),
      categories: listMemoryCategories().map((item) => ({ label: item.name, value: item.id })),
    };
  }
}

export async function getAdminProductDetail(id: string): Promise<AdminProductDetail | null> {
  if (!db) return mapMemoryProductRow(id);

  try {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        shortDescription: products.shortDescription,
        description: products.description,
        purchaseMode: products.purchaseMode,
        status: products.status,
        stockQuantity: products.stockQuantity,
        moq: products.moq,
        leadTimeMin: products.leadTimeMin,
        leadTimeMax: products.leadTimeMax,
        leadTimeUnit: products.leadTimeUnit,
        lifecycleStatus: products.lifecycleStatus,
        eolDate: products.eolDate,
        lastTimeBuyDate: products.lastTimeBuyDate,
        efficiencyClass: products.efficiencyClass,
        certifications: products.certifications,
        configurationRules: products.configurationRules,
        torqueCurveData: products.torqueCurveData,
        paidSampleEnabled: products.paidSampleEnabled,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currencyCode: products.currencyCode,
        featured: products.featured,
        brandId: products.brandId,
        defaultCategoryId: products.defaultCategoryId,
        brandName: brands.name,
        categoryName: categories.name,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.defaultCategoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return null;
    }

    const [imageRows, featureRows, attachmentRows, relationRows] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
      db.select().from(productFeatures).where(eq(productFeatures.productId, id)).orderBy(asc(productFeatures.sortOrder)),
      db.select().from(attachments).where(eq(attachments.productId, id)).orderBy(asc(attachments.sortOrder)),
      db
        .select({
          id: productRelations.id,
          relatedProductId: productRelations.relatedProductId,
          relatedProductName: products.name,
          relatedProductSku: products.sku,
          relationType: productRelations.relationType,
          relationLabel: productRelations.relationLabel,
          sortOrder: productRelations.sortOrder,
        })
        .from(productRelations)
        .innerJoin(products, eq(products.id, productRelations.relatedProductId))
        .where(eq(productRelations.productId, id))
        .orderBy(asc(productRelations.sortOrder)),
    ]);

    return {
      ...product,
      eolDate: product.eolDate ? product.eolDate.toISOString() : null,
      lastTimeBuyDate: product.lastTimeBuyDate ? product.lastTimeBuyDate.toISOString() : null,
      images: imageRows.map((item) => ({
        id: item.id,
        url: item.url,
        alt: item.alt,
        width: item.width,
        height: item.height,
        isPrimary: item.isPrimary,
      })),
      features: featureRows.map((item) => ({
        id: item.id,
        featureKey: item.featureKey,
        featureValue: item.featureValue,
        featureValueMin: item.featureValueMin ? Number(item.featureValueMin) : null,
        featureValueMax: item.featureValueMax ? Number(item.featureValueMax) : null,
        valueType: item.valueType || 'text',
        conditionalValue: item.conditionalValue as Record<string, unknown> | null,
        unit: item.unit,
        specCategory: item.specCategory || 'general',
      })),
      attachments: attachmentRows.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        mimeType: item.mimeType,
      })),
      compatibleProducts: relationRows.map((item) => ({
        id: item.id,
        relatedProductId: item.relatedProductId,
        relatedProductName: item.relatedProductName,
        relatedProductSku: item.relatedProductSku,
        relationType: item.relationType,
        relationLabel: item.relationLabel,
        sortOrder: item.sortOrder,
      })),
    };
  } catch {
    return mapMemoryProductRow(id);
  }
}

export async function createAdminProduct(input: AdminProductInput) {
  if (!db) {
    return createMemoryProduct(toMemoryProductPayload(input));
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          name: input.name,
          slug: input.slug,
          sku: input.sku,
          shortDescription: input.shortDescription ?? null,
          description: input.description ?? null,
          purchaseMode: input.purchaseMode,
          status: input.status,
          price: input.price.toFixed(2),
          compareAtPrice: input.compareAtPrice == null ? null : input.compareAtPrice.toFixed(2),
          currencyCode: input.currencyCode.toUpperCase(),
          stockQuantity: input.stockQuantity,
          moq: input.moq ?? 1,
          leadTimeMin: input.leadTimeMin ?? 3,
          leadTimeMax: input.leadTimeMax ?? 15,
          leadTimeUnit: input.leadTimeUnit ?? 'business_days',
          lifecycleStatus: (input.lifecycleStatus as 'new' | 'active' | 'nfd' | 'eol' | 'last_time_buy') ?? 'active',
          eolDate: input.eolDate ? new Date(input.eolDate) : null,
          lastTimeBuyDate: input.lastTimeBuyDate ? new Date(input.lastTimeBuyDate) : null,
          efficiencyClass: input.efficiencyClass ?? null,
          certifications: input.certifications ?? [],
          configurationRules: input.configurationRules ?? null,
          torqueCurveData: input.torqueCurveData ?? null,
          paidSampleEnabled: input.paidSampleEnabled ?? false,
          featured: input.featured,
          brandId: input.brandId ?? null,
          defaultCategoryId: input.defaultCategoryId ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
        })
        .returning();

      if (!product) {
        return null;
      }

      if (input.images.length) {
        await tx.insert(productImages).values(
          input.images.map((item, index) => ({
            productId: product.id,
            url: item.url,
            alt: item.alt,
            width: item.width ?? null,
            height: item.height ?? null,
            isPrimary: item.isPrimary,
            sortOrder: index + 1,
          })),
        );
      }

      if (input.features.length) {
        await tx.insert(productFeatures).values(
          input.features.map((item, index) => ({
            productId: product.id,
            featureKey: item.featureKey,
            featureValue: item.featureValue,
            featureValueMin: item.featureValueMin != null ? String(item.featureValueMin) : null,
            featureValueMax: item.featureValueMax != null ? String(item.featureValueMax) : null,
            valueType: item.valueType || 'text',
            conditionalValue: item.conditionalValue ?? null,
            unit: item.unit ?? null,
            specCategory: item.specCategory || 'general',
            sortOrder: index + 1,
          })),
        );
      }

      if (input.attachments.length) {
        await tx.insert(attachments).values(
          input.attachments.map((item, index) => ({
            productId: product.id,
            name: item.name,
            url: item.url,
            mimeType: item.mimeType,
            sortOrder: index + 1,
          })),
        );
      }

      if (input.compatibleProducts?.length) {
        await tx.insert(productRelations).values(
          input.compatibleProducts.map((item, index) => ({
            productId: product.id,
            relatedProductId: item.relatedProductId,
            relationType: item.relationType,
            relationLabel: item.relationLabel ?? null,
            sortOrder: item.sortOrder ?? index + 1,
          })),
        );
      }

      return product;
    });

    return created;
  } catch {
    return createMemoryProduct(toMemoryProductPayload(input));
  }
}

export async function updateAdminProduct(id: string, input: Partial<AdminProductInput>) {
  if (!db) {
    return updateMemoryProduct(id, {
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      shortDescription: input.shortDescription,
      description: input.description,
      purchaseMode: input.purchaseMode,
      status: input.status,
      price: input.price == null ? undefined : input.price.toFixed(2),
      compareAtPrice: input.compareAtPrice == null ? input.compareAtPrice : input.compareAtPrice.toFixed(2),
      currencyCode: input.currencyCode?.toUpperCase(),
      stockQuantity: input.stockQuantity,
      moq: input.moq,
      leadTimeMin: input.leadTimeMin,
      leadTimeMax: input.leadTimeMax,
      leadTimeUnit: input.leadTimeUnit,
      lifecycleStatus: input.lifecycleStatus,
      eolDate: input.eolDate,
      lastTimeBuyDate: input.lastTimeBuyDate,
      efficiencyClass: input.efficiencyClass,
      certifications: input.certifications,
      featured: input.featured,
      brandId: input.brandId,
      defaultCategoryId: input.defaultCategoryId,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      images: input.images?.map((item) => ({
        url: item.url,
        alt: item.alt,
        width: item.width ?? null,
        height: item.height ?? null,
        isPrimary: item.isPrimary,
      })),
      features: input.features?.map((item) => ({
        featureKey: item.featureKey,
        featureValue: item.featureValue,
        featureValueMin: item.featureValueMin ?? null,
        featureValueMax: item.featureValueMax ?? null,
        valueType: item.valueType || 'text',
        conditionalValue: item.conditionalValue ?? null,
        unit: item.unit ?? null,
        specCategory: item.specCategory || 'general',
      })),
      attachments: input.attachments?.map((item) => ({
        name: item.name,
        url: item.url,
        mimeType: item.mimeType,
      })),
      compatibleProducts: input.compatibleProducts?.map((item, index) => ({
        relatedProductId: item.relatedProductId,
        relationType: item.relationType,
        relationLabel: item.relationLabel ?? null,
        sortOrder: item.sortOrder ?? index + 1,
      })),
    });
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const updates = {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        shortDescription: input.shortDescription,
        description: input.description,
        purchaseMode: input.purchaseMode,
        status: input.status,
        price: input.price == null ? undefined : input.price.toFixed(2),
        compareAtPrice: input.compareAtPrice == null ? input.compareAtPrice : input.compareAtPrice.toFixed(2),
        currencyCode: input.currencyCode?.toUpperCase(),
        stockQuantity: input.stockQuantity,
        moq: input.moq,
        leadTimeMin: input.leadTimeMin,
        leadTimeMax: input.leadTimeMax,
        leadTimeUnit: input.leadTimeUnit,
        lifecycleStatus: input.lifecycleStatus as 'new' | 'active' | 'nfd' | 'eol' | 'last_time_buy' | undefined,
        eolDate: input.eolDate ? new Date(input.eolDate) : undefined,
        lastTimeBuyDate: input.lastTimeBuyDate ? new Date(input.lastTimeBuyDate) : undefined,
        efficiencyClass: input.efficiencyClass,
        certifications: input.certifications,
        configurationRules: input.configurationRules,
        torqueCurveData: input.torqueCurveData,
        paidSampleEnabled: input.paidSampleEnabled,
        featured: input.featured,
        brandId: input.brandId,
        defaultCategoryId: input.defaultCategoryId,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        updatedAt: new Date(),
      };

      const [product] = await tx.update(products).set(updates).where(eq(products.id, id)).returning();
      if (!product) {
        return null;
      }

      if (input.images) {
        await tx.delete(productImages).where(eq(productImages.productId, id));
        if (input.images.length) {
          await tx.insert(productImages).values(
            input.images.map((item, index) => ({
              productId: id,
              url: item.url,
              alt: item.alt,
              width: item.width ?? null,
              height: item.height ?? null,
              isPrimary: item.isPrimary,
              sortOrder: index + 1,
            })),
          );
        }
      }

      if (input.features) {
        await tx.delete(productFeatures).where(eq(productFeatures.productId, id));
        if (input.features.length) {
          await tx.insert(productFeatures).values(
            input.features.map((item, index) => ({
              productId: id,
              featureKey: item.featureKey,
              featureValue: item.featureValue,
              featureValueMin: item.featureValueMin != null ? String(item.featureValueMin) : null,
              featureValueMax: item.featureValueMax != null ? String(item.featureValueMax) : null,
              valueType: item.valueType || 'text',
              conditionalValue: item.conditionalValue ?? null,
              unit: item.unit ?? null,
              specCategory: item.specCategory || 'general',
              sortOrder: index + 1,
            })),
          );
        }
      }

      if (input.attachments) {
        await tx.delete(attachments).where(eq(attachments.productId, id));
        if (input.attachments.length) {
          await tx.insert(attachments).values(
            input.attachments.map((item, index) => ({
              productId: id,
              name: item.name,
              url: item.url,
              mimeType: item.mimeType,
              sortOrder: index + 1,
            })),
          );
        }
      }

      if (input.compatibleProducts) {
        await tx.delete(productRelations).where(eq(productRelations.productId, id));
        if (input.compatibleProducts.length) {
          await tx.insert(productRelations).values(
            input.compatibleProducts.map((item, index) => ({
              productId: id,
              relatedProductId: item.relatedProductId,
              relationType: item.relationType,
              relationLabel: item.relationLabel ?? null,
              sortOrder: item.sortOrder ?? index + 1,
            })),
          );
        }
      }

      return product;
    });

    return updated;
  } catch {
    return updateMemoryProduct(id, {
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      shortDescription: input.shortDescription,
      description: input.description,
      purchaseMode: input.purchaseMode,
      status: input.status,
      price: input.price == null ? undefined : input.price.toFixed(2),
      compareAtPrice: input.compareAtPrice == null ? input.compareAtPrice : input.compareAtPrice.toFixed(2),
      currencyCode: input.currencyCode?.toUpperCase(),
      stockQuantity: input.stockQuantity,
      featured: input.featured,
      brandId: input.brandId,
      defaultCategoryId: input.defaultCategoryId,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      images: input.images?.map((item) => ({
        url: item.url,
        alt: item.alt,
        width: item.width ?? null,
        height: item.height ?? null,
        isPrimary: item.isPrimary,
      })),
      features: input.features?.map((item) => ({
        featureKey: item.featureKey,
        featureValue: item.featureValue,
        featureValueMin: item.featureValueMin ?? null,
        featureValueMax: item.featureValueMax ?? null,
        valueType: item.valueType || 'text',
        conditionalValue: item.conditionalValue ?? null,
        unit: item.unit ?? null,
        specCategory: item.specCategory || 'general',
      })),
      attachments: input.attachments?.map((item) => ({
        name: item.name,
        url: item.url,
        mimeType: item.mimeType,
      })),
      compatibleProducts: input.compatibleProducts?.map((item, index) => ({
        relatedProductId: item.relatedProductId,
        relationType: item.relationType,
        relationLabel: item.relationLabel ?? null,
        sortOrder: item.sortOrder ?? index + 1,
      })),
    });
  }
}

export async function deleteAdminProduct(id: string) {
  if (!db) {
    return deleteMemoryProduct(id);
  }

  try {
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return Boolean(deleted);
  } catch {
    return deleteMemoryProduct(id);
  }
}