import { and, asc, count, desc, eq, ilike, inArray, or, sql as drizzleSql } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  attachments,
  brands,
  categories,
  contentBlocks,
  productCategories,
  productFeatures,
  productImages,
  productRelations,
  products,
  productVariants,
} from '@/server/db/schema';

import { storefrontNavigationBase, footerContactBlocks, footerPaymentMethods, footerCopyright } from './site-shell';
import { getSeedCategories, getSeedHomeData, getSeedProductBySlug, getSeedProductsResult } from './seed';
import type { HomeData, NavigationData, ProductListResult, ProductListSort, StorefrontCategory, StorefrontCompatibleGroup, StorefrontImage, StorefrontProductCard, StorefrontProductDetail } from './types';

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

function getProductOrderBy(sort: ProductListSort) {
  switch (sort) {
    case 'name-asc':
      return [asc(products.name)];
    case 'price-asc':
      return [asc(products.price), asc(products.name)];
    case 'price-desc':
      return [desc(products.price), asc(products.name)];
    case 'newest':
      return [desc(products.publishedAt), desc(products.createdAt), asc(products.name)];
    case 'featured':
    default:
      return [desc(products.featured), desc(products.publishedAt), asc(products.name)];
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

export async function getHomeData(): Promise<HomeData> {
  if (!db) {
    return getSeedHomeData();
  }

  try {
    const [featuredProducts, categoryRows] = await Promise.all([
      db.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        shortDescription: products.shortDescription,
        purchaseMode: products.purchaseMode,
        stockQuantity: products.stockQuantity,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currencyCode: products.currencyCode,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.status, 'active'), eq(products.featured, true)))
        .orderBy(desc(products.publishedAt), desc(products.createdAt))
        .limit(6),
      getCategories(),
    ]);

    const dbProducts =
      featuredProducts.length > 0
        ? featuredProducts
        : await db
            .select({
              id: products.id,
              name: products.name,
              slug: products.slug,
              sku: products.sku,
              shortDescription: products.shortDescription,
              purchaseMode: products.purchaseMode,
              stockQuantity: products.stockQuantity,
              price: products.price,
              compareAtPrice: products.compareAtPrice,
              currencyCode: products.currencyCode,
              brandId: products.brandId,
              brandName: brands.name,
              brandSlug: brands.slug,
            })
            .from(products)
            .leftJoin(brands, eq(products.brandId, brands.id))
            .where(eq(products.status, 'active'))
            .orderBy(desc(products.publishedAt), desc(products.createdAt))
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
      return getSeedHomeData();
    }

    const dynamicCards = dbProducts.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
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

    const seedBase = getSeedHomeData();
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
    return getSeedHomeData();
  }
}

export async function getNavigationData(): Promise<NavigationData> {
  const items = await getCategories();
  return {
    ...storefrontNavigationBase,
    categories: items.slice(0, 6),
  };
}

export async function getCategories(): Promise<StorefrontCategory[]> {
  if (!db) {
    // Fallback to seed data when no database
    return getSeedCategories();
  }

  try {
    const [rows, countRows] = await Promise.all([
      db.select().from(categories).where(eq(categories.status, 'active')).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db
        .select({ categoryId: products.defaultCategoryId, total: count() })
        .from(products)
        .where(and(eq(products.status, 'active'), drizzleSql`${products.defaultCategoryId} is not null`))
        .groupBy(products.defaultCategoryId),
    ]);
    if (!rows.length) {
      // Fallback to seed data when database is empty
      return getSeedCategories();
    }

    const productCountByCategoryId = new Map(countRows.map((item) => [item.categoryId, Number(item.total)]));

    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      parentId: item.parentId,
      productCount: productCountByCategoryId.get(item.id) ?? 0,
      image: item.imageUrl ? { id: `${item.id}-img`, url: item.imageUrl, alt: item.name } : null,
      isFeatured: item.isFeatured,
      featuredOrder: item.featuredOrder,
    }));
  } catch {
    // Fallback to seed data on error
    return getSeedCategories();
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
}): Promise<ProductListResult> {
  if (!db) {
    return getSeedProductsResult(input);
  }

  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 12;
  const offset = (page - 1) * pageSize;
  const orderBy = getProductOrderBy(input.sort ?? 'featured');

  try {
    let categoryId: string | null = null;
    if (input.categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.categorySlug)).limit(1);
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
        ilike(products.name, `%${input.keyword}%`),
        ilike(products.sku, `%${input.keyword}%`),
        ilike(products.shortDescription, `%${input.keyword}%`),
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
      filters.push(drizzleSql`${products.stockQuantity} > 0`);
      facetFilters.push(drizzleSql`${products.stockQuantity} > 0`);
    }

    const baseWhere = and(...filters);
    const facetWhere = and(...facetFilters);

    const rows = categoryId
      ? await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            sku: products.sku,
            shortDescription: products.shortDescription,
            purchaseMode: products.purchaseMode,
            stockQuantity: products.stockQuantity,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            currencyCode: products.currencyCode,
            brandId: brands.id,
            brandName: brands.name,
            brandSlug: brands.slug,
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
            name: products.name,
            slug: products.slug,
            sku: products.sku,
            shortDescription: products.shortDescription,
            purchaseMode: products.purchaseMode,
            stockQuantity: products.stockQuantity,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            currencyCode: products.currencyCode,
            brandId: brands.id,
            brandName: brands.name,
            brandSlug: brands.slug,
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
        sku: item.sku,
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

export async function getProductBySlug(slug: string): Promise<StorefrontProductDetail | null> {
  if (!db) {
    return getSeedProductBySlug(slug);
  }

  try {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        shortDescription: products.shortDescription,
        description: products.description,
        descriptionLong: products.descriptionLong,
        purchaseMode: products.purchaseMode,
        stockQuantity: products.stockQuantity,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currencyCode: products.currencyCode,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        featured: products.featured,
        allowBackorder: products.allowBackorder,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.slug, slug), eq(products.status, 'active')))
      .limit(1);

    if (!product) {
      return null;
    }

    const [images, categoryRows, attachmentRows, featureRows, variantRows] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          parentId: categories.parentId,
          imageUrl: categories.imageUrl,
        })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, product.id)),
      db.select().from(attachments).where(eq(attachments.productId, product.id)).orderBy(asc(attachments.sortOrder)),
      db.select().from(productFeatures).where(eq(productFeatures.productId, product.id)).orderBy(asc(productFeatures.sortOrder)),
      db.select().from(productVariants).where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.createdAt)),
    ]);

    const related = await getRelatedProducts(slug, categoryRows[0]?.slug ?? null, product.id);
    const compatibleGroups = await getCompatibleGroups(product.id);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description ?? '',
      coverImage: images[0] ? toImage(images[0]) : null,
      gallery: images.map(toImage),
      price: asMoney(product.price, product.currencyCode),
      compareAtPrice: product.compareAtPrice ? asMoney(product.compareAtPrice, product.currencyCode) : null,
      purchaseMode: product.purchaseMode,
      inStock: product.stockQuantity > 0,
      stockQuantity: product.stockQuantity,
      moq: 1,
      leadTimeMin: 3,
      leadTimeMax: 15,
      leadTimeUnit: 'business_days',
      lifecycleStatus: 'active',
      eolDate: null,
      lastTimeBuyDate: null,
      efficiencyClass: null,
      certifications: undefined,
      configurationRules: undefined,
      torqueCurveData: undefined,
      brand: product.brandId && product.brandName && product.brandSlug ? { id: product.brandId, name: product.brandName, slug: product.brandSlug } : null,
      categories: categoryRows.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        parentId: item.parentId,
        image: item.imageUrl ? { id: `${item.id}-img`, url: item.imageUrl, alt: item.name } : null,
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
      features: featureRows.map((item) => ({
        key: item.featureKey,
        value: item.featureValue,
        unit: item.unit,
        category: item.specCategory || 'general',
        valueMin: item.featureValueMin ? Number(item.featureValueMin) : null,
        valueMax: item.featureValueMax ? Number(item.featureValueMax) : null,
        valueType: item.valueType || 'text',
        conditionalValue: item.conditionalValue as Record<string, unknown> | null,
      })),
      descriptionLong: product.descriptionLong || null,
    };
  } catch (error) {
    console.error('getProductBySlug DB error:', error);
    return null;
  }
}

export async function getRelatedProducts(slug: string, categorySlug?: string | null, excludeId?: string): Promise<StorefrontProductCard[]> {
  if (!db) {
    return [];
  }

  try {
    let categoryId: string | null = null;
    if (categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      categoryId = category?.id ?? null;
    }

    const cardSelect = {
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      shortDescription: products.shortDescription,
      purchaseMode: products.purchaseMode,
      stockQuantity: products.stockQuantity,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      currencyCode: products.currencyCode,
      coverUrl: productImages.url,
      coverAlt: productImages.alt,
      coverWidth: productImages.width,
      coverHeight: productImages.height,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
    };

    const rows = categoryId
      ? await db
          .select(cardSelect)
          .from(products)
          .innerJoin(productCategories, eq(productCategories.productId, products.id))
          .leftJoin(brands, eq(products.brandId, brands.id))
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
          .where(and(eq(products.status, 'active'), eq(productCategories.categoryId, categoryId), excludeId ? drizzleSql`${products.id} <> ${excludeId}` : undefined))
          .orderBy(desc(products.featured), desc(products.publishedAt))
          .limit(4)
      : await db
          .select(cardSelect)
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
          .where(and(eq(products.status, 'active'), excludeId ? drizzleSql`${products.id} <> ${excludeId}` : undefined))
          .orderBy(desc(products.featured), desc(products.publishedAt))
          .limit(4);

    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
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

export async function getCompatibleGroups(productId: string): Promise<StorefrontCompatibleGroup[]> {
  if (!db) return [];

  try {
    const rows = await db
      .select({
        relationType: productRelations.relationType,
        relationLabel: productRelations.relationLabel,
        sortOrder: productRelations.sortOrder,
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        shortDescription: products.shortDescription,
        purchaseMode: products.purchaseMode,
        stockQuantity: products.stockQuantity,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currencyCode: products.currencyCode,
        coverUrl: productImages.url,
        coverAlt: productImages.alt,
        coverWidth: productImages.width,
        coverHeight: productImages.height,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
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
        sku: row.sku,
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
