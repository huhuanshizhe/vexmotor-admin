import { and, asc, count, desc, eq, ilike, inArray, or, sql as drizzleSql } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  attachments,
  brands,
  categories,
  categoryTranslations,
  contentBlocks,
  productCategories,
  productImages,
  productRelations,
  products,
  productTranslations,
  productVariants,
} from '@/server/db/schema';

import { getStorefrontProductFeatureOptions, getStorefrontProductFeatures } from '@/server/admin/product-features';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import {
  footerContactBlocks,
  footerCopyright,
  footerPaymentMethods,
  storefrontNavigationBase,
} from '@/server/storefront/site-shell';
import type { HomeData, NavigationData, ProductListResult, ProductListSort, StorefrontCategory, StorefrontCompatibleGroup, StorefrontImage, StorefrontProductCard, StorefrontProductDetail } from './types';
import { brandNameSql, brandSlugSql } from '@/server/brands/resolve-brand-translation';
import {
  DEFAULT_PRODUCT_LOCALE,
  productCompareAtPriceSql,
  productCurrencyCodeSql,
  productDescriptionLongSql,
  productDescriptionSql,
  productLeadTimeMaxSql,
  productLeadTimeMinSql,
  productLeadTimeUnitSql,
  productLifecycleStatusSql,
  productMoqSql,
  productNameSql,
  productPriceSql,
  productSeoDescriptionSql,
  productSeoTitleSql,
  productShortDescriptionSql,
  productSlugSql,
  productStockQuantitySql,
} from '@/server/products/resolve-product-translation';
import {
  categoryDescriptionSql,
  categoryNameSql,
  categorySlugSql,
  DEFAULT_CATEGORY_LOCALE,
} from '@/server/categories/resolve-category-translation';

function catalogLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

const defaultHomeData: HomeData = {
  heroBanners: [],
  featuredCategories: [],
  hotSale: [],
  newRelease: [],
  featuredIndustries: [],
  testimonials: [],
  trustHighlights: [
    { title: 'Free Shipping', description: 'Free shipping and duties on orders $299+.' },
    { title: 'Easy Returns', description: 'Fast returns processed within 30 days.' },
    { title: 'Secure Payments', description: 'Multiple secure payment options available.' },
    { title: 'Reliable Support', description: 'Quick support during business hours.' },
  ],
  categoryGroups: [],
  sellingPoints: [],
  featuredShelves: [],
  mostViewedProducts: [],
  newsletter: {
    title: 'Subscribe To Our Newsletter!!',
    description: 'Be Aware of The Latest News, Special Offers and Discounts',
    placeholder: 'Enter Your E-mail Address...',
    buttonLabel: 'SUBSCRIBE',
  },
  brandStory: {
    title: 'Our Promise',
    description: 'Factory-direct motion components with transparent specs, stable quality control, and engineering-first support.',
  },
  footerSections: [
    { id: 'catalog', title: 'Catalog', links: [{ label: 'Products', href: '/products' }, { label: 'Categories', href: '/products' }] },
    { id: 'support', title: 'Support', links: [{ label: 'FAQ', href: '/faq' }, { label: 'Contact', href: '/contact' }] },
  ],
  footerContact: footerContactBlocks,
  paymentMethods: footerPaymentMethods,
  copyright: footerCopyright,
};

function emptyProductListResult(page: number, pageSize: number): ProductListResult {
  return {
    items: [],
    meta: { page, pageSize, total: 0, totalPages: 1 },
    facets: [
      {
        key: 'purchaseMode',
        label: 'Purchase Mode',
        options: [
          { label: 'Direct Buy', value: 'buy', count: 0 },
          { label: 'Inquiry', value: 'inquiry', count: 0 },
        ],
      },
    ],
  };
}

function getProductOrderBy(sort: ProductListSort, locale: string) {
  switch (sort) {
    case 'name-asc':
      return [asc(productNameSql(products.id, locale))];
    case 'price-asc':
      return [asc(productPriceSql(products.id, locale)), asc(productNameSql(products.id, locale))];
    case 'price-desc':
      return [desc(productPriceSql(products.id, locale)), asc(productNameSql(products.id, locale))];
    case 'newest':
      return [desc(products.updatedAt), desc(products.createdAt), asc(productNameSql(products.id, locale))];
    case 'featured':
    default:
      return [desc(products.featured), desc(products.updatedAt), asc(productNameSql(products.id, locale))];
  }
}

function asMoney(amount: string | number | null | undefined, currencyCode = 'USD') {
  const numeric = Number(amount ?? 0);
  return {
    currency: currencyCode,
    amount: numeric,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(numeric),
  };
}

function toImage(row: {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  isDimension?: boolean | null;
  imageType?: string | null;
}): StorefrontImage {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    isDimension: row.isDimension ?? undefined,
    imageType: row.imageType ?? undefined,
  };
}

export async function getHomeData(localeInput?: string | null): Promise<HomeData> {
  const locale = catalogLocale(localeInput);
  try {
    const [featuredProducts, categoryRows] = await Promise.all([
      db.select({
        id: products.id,
        name: productNameSql(products.id, locale),
        slug: productSlugSql(products.id, locale),
        spu: products.spu,
        shortDescription: productShortDescriptionSql(products.id, locale),
        purchaseMode: products.purchaseMode,
        stockQuantity: productStockQuantitySql(products.id, locale),
        price: productPriceSql(products.id, locale),
        compareAtPrice: productCompareAtPriceSql(products.id, locale),
        currencyCode: productCurrencyCodeSql(products.id, locale),
        brandId: products.brandId,
        brandName: brandNameSql(brands.id, locale),
        brandSlug: brandSlugSql(brands.id, locale),
      })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.status, 'active'), eq(products.featured, true)))
        .orderBy(desc(products.updatedAt), desc(products.createdAt))
        .limit(6),
      getCategories(locale),
    ]);

    const dbProducts =
      featuredProducts.length > 0
        ? featuredProducts
        : await db
            .select({
              id: products.id,
              name: productNameSql(products.id, locale),
              slug: productSlugSql(products.id, locale),
              spu: products.spu,
              shortDescription: productShortDescriptionSql(products.id, locale),
              purchaseMode: products.purchaseMode,
              stockQuantity: productStockQuantitySql(products.id, locale),
              price: productPriceSql(products.id, locale),
              compareAtPrice: productCompareAtPriceSql(products.id, locale),
              currencyCode: productCurrencyCodeSql(products.id, locale),
              brandId: products.brandId,
              brandName: brandNameSql(brands.id, locale),
              brandSlug: brandSlugSql(brands.id, locale),
            })
            .from(products)
            .leftJoin(brands, eq(products.brandId, brands.id))
            .where(eq(products.status, 'active'))
            .orderBy(desc(products.updatedAt), desc(products.createdAt))
            .limit(6);

    const imageRows = dbProducts.length
      ? await db
          .select({
            id: productImages.id,
            productId: productImages.productId,
            url: productImages.url,
            alt: productImages.alt,
            width: productImages.width,
            height: productImages.height,
          })
          .from(productImages)
          .where(inArray(productImages.productId, dbProducts.map((item) => item.id)))
          .orderBy(asc(productImages.productId), asc(productImages.sortOrder))
      : [];

    const firstImageByProductId = new Map<string, StorefrontImage>();
    for (const row of imageRows) {
      if (!firstImageByProductId.has(row.productId)) {
        firstImageByProductId.set(row.productId, toImage(row));
      }
    }

    if (!dbProducts.length) {
      return defaultHomeData;
    }

    const dynamicCards = dbProducts.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      spu: item.spu,
      shortDescription: item.shortDescription,
      coverImage: firstImageByProductId.get(item.id) ?? null,
      price: asMoney(item.price, item.currencyCode),
      compareAtPrice: item.compareAtPrice ? asMoney(item.compareAtPrice, item.currencyCode) : null,
      purchaseMode: item.purchaseMode,
      inStock: item.stockQuantity > 0,
      brand: item.brandId && item.brandName && item.brandSlug ? { id: item.brandId, name: item.brandName, slug: item.brandSlug } : null,
    }));

    function cycleItems<T>(items: T[], start: number, count: number) {
      if (!items.length) {
        return [] as T[];
      }

      const length = Math.min(count, items.length);
      return Array.from({ length }, (_, index) => items[(start + index) % items.length]!);
    }

    const dynamicShelves: HomeData['featuredShelves'] = [
      {
        id: 'bestseller',
        title: 'Bestseller',
        items: cycleItems(dynamicCards, 0, 4).map((item, index) => ({ ...item, tag: index < 2 ? 'Hot' : null, note: item.shortDescription ?? null })),
      },
      {
        id: 'new-products',
        title: 'New Products',
        items: cycleItems(dynamicCards, 1, 4).map((item, index) => ({ ...item, tag: index < 2 ? 'New' : null, note: item.shortDescription ?? null })),
      },
      {
        id: 'sales-products',
        title: 'Specials',
        items: cycleItems(dynamicCards, 2, 4).map((item, index) => ({ ...item, tag: `-${10 + index * 5}%`, note: item.shortDescription ?? null })),
      },
      {
        id: 'used-products',
        title: 'Used Products',
        items: cycleItems(dynamicCards, 3, 4).map((item) => ({ ...item, tag: 'Used', note: item.shortDescription ?? null })),
      },
    ];

    // Read homepage content blocks for admin-configurable content
    const homepageBlocks = await db
      .select({ blockKey: contentBlocks.blockKey, content: contentBlocks.content })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.placement, 'homepage'), eq(contentBlocks.status, 'active')))
      .orderBy(asc(contentBlocks.sortOrder));

    const blockOverrides = Object.fromEntries(
      homepageBlocks.map((b) => [b.blockKey, b.content as Record<string, unknown>]),
    );

    const seedBase = defaultHomeData;
    const heroBanners =
      Array.isArray(blockOverrides.heroBanners) && (blockOverrides.heroBanners as Array<{ id?: unknown }>).length > 0
        ? (blockOverrides.heroBanners as typeof seedBase.heroBanners)
        : seedBase.heroBanners;

    return {
      ...seedBase,
      heroBanners,
      featuredCategories: categoryRows
        .filter((item) => (item.productCount ?? 0) > 0)
        .sort((left, right) => (right.productCount ?? 0) - (left.productCount ?? 0))
        .slice(0, 8),
      hotSale: dynamicCards.slice(0, 4),
      newRelease: dynamicCards.slice(0, 3),
      featuredShelves: dynamicShelves,
      mostViewedProducts: dynamicCards.slice(0, 4),
    };
  } catch {
    return defaultHomeData;
  }
}

export async function getNavigationData(localeInput?: string | null): Promise<NavigationData> {
  const items = await getCategories(localeInput);
  return {
    ...storefrontNavigationBase,
    categories: items.slice(0, 6),
  };
}

export async function getCategories(localeInput?: string | null): Promise<StorefrontCategory[]> {
  const locale = catalogLocale(localeInput);
  try {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: categories.id,
          parentId: categories.parentId,
          name: categoryNameSql(categories.id, locale),
          slug: categorySlugSql(categories.id, locale),
          description: categoryDescriptionSql(categories.id, locale),
          imageUrl: categories.imageUrl,
          isFeatured: categories.isFeatured,
          featuredOrder: categories.featuredOrder,
        })
        .from(categories)
        .where(eq(categories.status, 'active'))
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select({ categoryId: products.defaultCategoryId, total: count() })
        .from(products)
        .where(and(eq(products.status, 'active'), drizzleSql`${products.defaultCategoryId} is not null`))
        .groupBy(products.defaultCategoryId),
    ]);
    if (!rows.length) {
      return [];
    }

    const productCountByCategoryId = new Map(countRows.map((item) => [item.categoryId, Number(item.total)]));

    return rows.map((item) => ({
      id: item.id,
      name: item.name ?? '',
      slug: item.slug ?? '',
      description: item.description,
      parentId: item.parentId,
      productCount: productCountByCategoryId.get(item.id) ?? 0,
      image: item.imageUrl ? { id: `${item.id}-img`, url: item.imageUrl, alt: item.name ?? '' } : null,
      isFeatured: item.isFeatured,
      featuredOrder: item.featuredOrder,
    }));
  } catch {
    return [];
  }
}

export async function getProductList(input: {
  keyword?: string;
  categorySlug?: string;
  purchaseMode?: 'buy' | 'inquiry';
  page?: number;
  pageSize?: number;
  sort?: ProductListSort;
  inStockOnly?: boolean;
  locale?: string | null;
}): Promise<ProductListResult> {
  const locale = catalogLocale(input.locale);
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 12;
  const offset = (page - 1) * pageSize;
  const orderBy = getProductOrderBy(input.sort ?? 'featured', locale);

  try {
    let categoryId: string | null = null;
    if (input.categorySlug) {
      const [category] = await db
        .select({ id: categoryTranslations.categoryId })
        .from(categoryTranslations)
        .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
        .where(and(
          eq(categoryTranslations.slug, input.categorySlug),
          eq(categoryTranslations.locale, locale),
        ))
        .limit(1);
      if (!category) {
        return {
          items: [],
          meta: { page, pageSize, total: 0, totalPages: 1 },
          facets: [],
        };
      }
      categoryId = category.id;
    }

    const filters = [eq(products.status, 'active')];
    const facetFilters = [eq(products.status, 'active')];
    if (input.keyword) {
      const keywordFilter = or(
        ilike(productNameSql(products.id, locale), `%${input.keyword}%`),
        ilike(products.spu, `%${input.keyword}%`),
        ilike(productShortDescriptionSql(products.id, locale), `%${input.keyword}%`),
      );

      if (keywordFilter) {
        filters.push(keywordFilter);
        facetFilters.push(keywordFilter);
      }
    }

    if (input.purchaseMode) {
      filters.push(eq(products.purchaseMode, input.purchaseMode));
    }

    if (input.inStockOnly) {
      filters.push(drizzleSql`${productStockQuantitySql(products.id, locale)} > 0`);
      facetFilters.push(drizzleSql`${productStockQuantitySql(products.id, locale)} > 0`);
    }

    const baseWhere = and(...filters);
    const facetWhere = and(...facetFilters);

    const rows = categoryId
      ? await db
          .select({
            id: products.id,
            name: productNameSql(products.id, locale),
            slug: productSlugSql(products.id, locale),
            spu: products.spu,
            shortDescription: productShortDescriptionSql(products.id, locale),
            purchaseMode: products.purchaseMode,
            stockQuantity: productStockQuantitySql(products.id, locale),
            price: productPriceSql(products.id, locale),
            compareAtPrice: productCompareAtPriceSql(products.id, locale),
            currencyCode: productCurrencyCodeSql(products.id, locale),
            brandId: brands.id,
            brandName: brandNameSql(brands.id, locale),
            brandSlug: brandSlugSql(brands.id, locale),
          })
          .from(products)
          .innerJoin(productCategories, eq(productCategories.productId, products.id))
          .leftJoin(brands, eq(products.brandId, brands.id))
          .where(and(baseWhere, eq(productCategories.categoryId, categoryId)))
            .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset)
      : await db
          .select({
            id: products.id,
            name: productNameSql(products.id, locale),
            slug: productSlugSql(products.id, locale),
            spu: products.spu,
            shortDescription: productShortDescriptionSql(products.id, locale),
            purchaseMode: products.purchaseMode,
            stockQuantity: productStockQuantitySql(products.id, locale),
            price: productPriceSql(products.id, locale),
            compareAtPrice: productCompareAtPriceSql(products.id, locale),
            currencyCode: productCurrencyCodeSql(products.id, locale),
            brandId: brands.id,
            brandName: brandNameSql(brands.id, locale),
            brandSlug: brandSlugSql(brands.id, locale),
          })
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .where(baseWhere)
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

    const countRows = categoryId
      ? await db
          .select({ total: count() })
          .from(products)
          .innerJoin(productCategories, eq(productCategories.productId, products.id))
          .where(and(baseWhere, eq(productCategories.categoryId, categoryId)))
      : await db.select({ total: count() }).from(products).where(baseWhere);

    const facetCountRows = categoryId
      ? await db
          .select({ purchaseMode: products.purchaseMode, total: count() })
          .from(products)
          .innerJoin(productCategories, eq(productCategories.productId, products.id))
          .where(and(facetWhere, eq(productCategories.categoryId, categoryId)))
          .groupBy(products.purchaseMode)
      : await db
          .select({ purchaseMode: products.purchaseMode, total: count() })
          .from(products)
          .where(facetWhere)
          .groupBy(products.purchaseMode);

    const listImageRows = rows.length
      ? await db
          .select({
            id: productImages.id,
            productId: productImages.productId,
            url: productImages.url,
            alt: productImages.alt,
            width: productImages.width,
            height: productImages.height,
          })
          .from(productImages)
          .where(inArray(productImages.productId, rows.map((item) => item.id)))
          .orderBy(asc(productImages.productId), asc(productImages.sortOrder))
      : [];

    const listImageByProductId = new Map<string, StorefrontImage>();
    for (const row of listImageRows) {
      if (!listImageByProductId.has(row.productId)) {
        listImageByProductId.set(row.productId, toImage(row));
      }
    }

    const purchaseModeCounts = new Map(facetCountRows.map((row) => [row.purchaseMode, Number(row.total)]));

    return {
      items: rows.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        spu: item.spu,
        shortDescription: item.shortDescription,
        coverImage: listImageByProductId.get(item.id) ?? null,
        price: asMoney(item.price, item.currencyCode),
        compareAtPrice: item.compareAtPrice ? asMoney(item.compareAtPrice, item.currencyCode) : null,
        purchaseMode: item.purchaseMode,
        inStock: item.stockQuantity > 0,
        brand: item.brandId && item.brandName && item.brandSlug ? { id: item.brandId, name: item.brandName, slug: item.brandSlug } : null,
      })),
      meta: {
        page,
        pageSize,
        total: Number(countRows[0]?.total ?? 0),
        totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total ?? 0) / pageSize)),
      },
      facets: [
        {
          key: 'purchaseMode',
          label: 'Purchase Mode',
          options: [
            { label: 'Direct Buy', value: 'buy', count: purchaseModeCounts.get('buy') ?? 0 },
            { label: 'Inquiry', value: 'inquiry', count: purchaseModeCounts.get('inquiry') ?? 0 },
          ],
        },
      ],
    };
  } catch {
    return emptyProductListResult(page, pageSize);
  }
}

export async function getProductBySlug(slug: string, localeInput?: string | null): Promise<StorefrontProductDetail | null> {
  const locale = catalogLocale(localeInput);
  try {
    const [product] = await db
      .select({
        id: products.id,
        name: productTranslations.name,
        slug: productTranslations.slug,
        spu: products.spu,
        shortDescription: productTranslations.shortDescription,
        description: productTranslations.description,
        descriptionLong: productTranslations.descriptionLong,
        purchaseMode: products.purchaseMode,
        stockQuantity: productTranslations.stockQuantity,
        price: productTranslations.price,
        compareAtPrice: productTranslations.compareAtPrice,
        currencyCode: productTranslations.currencyCode,
        seoTitle: productTranslations.seoTitle,
        seoDescription: productTranslations.seoDescription,
        moq: productTranslations.moq,
        leadTimeMin: productTranslations.leadTimeMin,
        leadTimeMax: productTranslations.leadTimeMax,
        leadTimeUnit: productTranslations.leadTimeUnit,
        lifecycleStatus: productTranslations.lifecycleStatus,
        eolDate: productTranslations.eolDate,
        lastTimeBuyDate: productTranslations.lastTimeBuyDate,
        efficiencyClass: productTranslations.efficiencyClass,
        featured: products.featured,
        allowBackorder: products.allowBackorder,
        paidSampleEnabled: products.paidSampleEnabled,
        brandId: brands.id,
        brandName: brandNameSql(brands.id, locale),
        brandSlug: brandSlugSql(brands.id, locale),
        payload: productTranslations.payload,
      })
      .from(productTranslations)
      .innerJoin(products, eq(products.id, productTranslations.productId))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(
        eq(productTranslations.slug, slug),
        eq(productTranslations.locale, locale),
        eq(products.status, 'active'),
      ))
      .limit(1);

    if (!product) {
      return null;
    }

    const [images, categoryRows, attachmentRows, featureRows, configurableFeatures, variantRows] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
      db
        .select({
          id: categories.id,
          name: categoryNameSql(categories.id, locale),
          slug: categorySlugSql(categories.id, locale),
          description: categoryDescriptionSql(categories.id, locale),
          parentId: categories.parentId,
          imageUrl: categories.imageUrl,
        })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, product.id)),
      db.select().from(attachments).where(eq(attachments.productId, product.id)).orderBy(asc(attachments.sortOrder)),
      getStorefrontProductFeatures(product.id, locale),
      getStorefrontProductFeatureOptions(product.id, locale),
      db.select().from(productVariants).where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.createdAt)),
    ]);

    const related = await getRelatedProducts(slug, categoryRows[0]?.slug ?? null, product.id, locale);
    const compatibleGroups = await getCompatibleGroups(product.id, locale);

    const certifications = product.payload?.certifications ?? [];
    const eolDate = product.eolDate ? product.eolDate.toISOString() : null;
    const lastTimeBuyDate = product.lastTimeBuyDate ? product.lastTimeBuyDate.toISOString() : null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      spu: product.spu,
      shortDescription: product.shortDescription,
      description: product.description ?? '',
      coverImage: images[0] ? toImage(images[0]) : null,
      gallery: images.map(toImage),
      price: asMoney(product.price, product.currencyCode),
      compareAtPrice: product.compareAtPrice ? asMoney(product.compareAtPrice, product.currencyCode) : null,
      purchaseMode: product.purchaseMode,
      inStock: product.stockQuantity > 0,
      stockQuantity: product.stockQuantity,
      moq: product.moq,
      leadTimeMin: product.leadTimeMin,
      leadTimeMax: product.leadTimeMax,
      leadTimeUnit: product.leadTimeUnit,
      lifecycleStatus: product.lifecycleStatus,
      eolDate,
      lastTimeBuyDate,
      efficiencyClass: product.efficiencyClass,
      certifications,
      paidSampleEnabled: product.paidSampleEnabled,
      allowBackorder: product.allowBackorder,
      configurationRules: undefined,
      torqueCurveData: undefined,
      brand: product.brandId && product.brandName && product.brandSlug ? { id: product.brandId, name: product.brandName, slug: product.brandSlug } : null,
      categories: categoryRows.map((item) => ({
        id: item.id,
        name: item.name ?? '',
        slug: item.slug ?? '',
        description: item.description,
        parentId: item.parentId,
        image: item.imageUrl ? { id: `${item.id}-img`, url: item.imageUrl, alt: item.name ?? '' } : null,
      })),
      attributes: variantRows.flatMap((row) => row.attributes).slice(0, 8),
      attachments: attachmentRows.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        mimeType: item.mimeType,
      })),
      relatedProducts: related,
      compatibleGroups,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      seo: {
        title: product.seoTitle,
        description: product.seoDescription,
      },
      manufacturing: {
        moq: product.moq,
        leadTimeMin: product.leadTimeMin,
        leadTimeMax: product.leadTimeMax,
        leadTimeUnit: product.leadTimeUnit,
        lifecycleStatus: product.lifecycleStatus,
        eolDate,
        lastTimeBuyDate,
        efficiencyClass: product.efficiencyClass,
      },
      features: featureRows,
      configurableFeatures,
      descriptionLong: product.descriptionLong || null,
    };
  } catch (error) {
    console.error('getProductBySlug DB error:', error);
    return null;
  }
}

export async function getRelatedProducts(
  slug: string,
  categorySlug?: string | null,
  excludeId?: string,
  localeInput?: string | null,
): Promise<StorefrontProductCard[]> {
  const locale = catalogLocale(localeInput);
  try {
    let categoryId: string | null = null;
    if (categorySlug) {
      const [category] = await db
        .select({ id: categoryTranslations.categoryId })
        .from(categoryTranslations)
        .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
        .where(and(
          eq(categoryTranslations.slug, categorySlug),
          eq(categoryTranslations.locale, locale),
        ))
        .limit(1);
      categoryId = category?.id ?? null;
    }

    const cardSelect = {
      id: products.id,
      name: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      shortDescription: productShortDescriptionSql(products.id, locale),
      purchaseMode: products.purchaseMode,
      stockQuantity: productStockQuantitySql(products.id, locale),
      price: productPriceSql(products.id, locale),
      compareAtPrice: productCompareAtPriceSql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      coverUrl: productImages.url,
      coverAlt: productImages.alt,
      coverWidth: productImages.width,
      coverHeight: productImages.height,
      brandId: brands.id,
      brandName: brandNameSql(brands.id, locale),
      brandSlug: brandSlugSql(brands.id, locale),
    };

    const rows = categoryId
      ? await db
          .select(cardSelect)
          .from(products)
          .innerJoin(productCategories, eq(productCategories.productId, products.id))
          .leftJoin(brands, eq(products.brandId, brands.id))
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
          .where(and(eq(products.status, 'active'), eq(productCategories.categoryId, categoryId), excludeId ? drizzleSql`${products.id} <> ${excludeId}` : undefined))
          .orderBy(desc(products.featured), desc(products.updatedAt))
          .limit(4)
      : await db
          .select(cardSelect)
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
          .where(and(eq(products.status, 'active'), excludeId ? drizzleSql`${products.id} <> ${excludeId}` : undefined))
          .orderBy(desc(products.featured), desc(products.updatedAt))
          .limit(4);

    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      spu: item.spu,
      shortDescription: item.shortDescription,
      coverImage: item.coverUrl ? { id: `${item.id}-cover`, url: item.coverUrl, alt: item.coverAlt || item.name, width: item.coverWidth, height: item.coverHeight } : null,
      price: asMoney(item.price, item.currencyCode),
      compareAtPrice: item.compareAtPrice ? asMoney(item.compareAtPrice, item.currencyCode) : null,
      purchaseMode: item.purchaseMode,
      inStock: item.stockQuantity > 0,
      brand: item.brandId && item.brandName && item.brandSlug ? { id: item.brandId, name: item.brandName, slug: item.brandSlug } : null,
    }));
  } catch {
    return [];
  }
}

const RELATION_TYPE_LABELS: Record<string, string> = {
  drivers: 'Drivers',
  'mechanical-integration': 'Mechanical integration',
  'power-control': 'Power & control',
  custom: 'Compatible',
};

export async function getCompatibleGroups(productId: string, localeInput?: string | null): Promise<StorefrontCompatibleGroup[]> {
  const locale = catalogLocale(localeInput);
  try {
    const rows = await db
      .select({
        relationType: productRelations.relationType,
        relationLabel: productRelations.relationLabel,
        sortOrder: productRelations.sortOrder,
        id: products.id,
        name: productNameSql(products.id, locale),
        slug: productSlugSql(products.id, locale),
        spu: products.spu,
        shortDescription: productShortDescriptionSql(products.id, locale),
        purchaseMode: products.purchaseMode,
        stockQuantity: productStockQuantitySql(products.id, locale),
        price: productPriceSql(products.id, locale),
        compareAtPrice: productCompareAtPriceSql(products.id, locale),
        currencyCode: productCurrencyCodeSql(products.id, locale),
        coverUrl: productImages.url,
        coverAlt: productImages.alt,
        coverWidth: productImages.width,
        coverHeight: productImages.height,
        brandId: brands.id,
        brandName: brandNameSql(brands.id, locale),
        brandSlug: brandSlugSql(brands.id, locale),
      })
      .from(productRelations)
      .innerJoin(products, eq(products.id, productRelations.relatedProductId))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
      .where(and(eq(productRelations.productId, productId), eq(products.status, 'active')))
      .orderBy(asc(productRelations.sortOrder));

    const groupMap = new Map<string, StorefrontCompatibleGroup>();
    for (const row of rows) {
      const type = row.relationType;
      if (!groupMap.has(type)) {
        groupMap.set(type, {
          relationType: type,
          title: row.relationLabel ?? RELATION_TYPE_LABELS[type] ?? type,
          items: [],
        });
      }
      groupMap.get(type)!.items.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        spu: row.spu,
        shortDescription: row.shortDescription,
        coverImage: row.coverUrl ? { id: `${row.id}-cover`, url: row.coverUrl, alt: row.coverAlt || row.name, width: row.coverWidth, height: row.coverHeight } : null,
        price: asMoney(row.price, row.currencyCode),
        compareAtPrice: row.compareAtPrice ? asMoney(row.compareAtPrice, row.currencyCode) : null,
        purchaseMode: row.purchaseMode,
        inStock: row.stockQuantity > 0,
        brand: row.brandId && row.brandName && row.brandSlug ? { id: row.brandId, name: row.brandName, slug: row.brandSlug } : null,
      });
    }

    return Array.from(groupMap.values());
  } catch {
    return [];
  }
}
