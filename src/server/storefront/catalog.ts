import { and, asc, count, desc, eq, exists, ilike, inArray, or, sql as drizzleSql } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  attachments,
  brands,
  categories,
  categoryTranslations,
  contentBlocks,
  productCategories,
  productBoardAssignments,
  productImages,
  productRelations,
  products,
  productTranslations,
  productVariants,
  orderItems,
  orders,
} from '@/server/db/schema';

import {
  galleryFromPayload,
  loadProductTranslationsByProductIds,
  mergeGalleryWithCover,
  pickProductTranslation,
  resolveProductCoverImage,
} from '@/server/products/load-product-translations';
import { getStorefrontProductFeatureOptions, getStorefrontProductFeatures } from '@/server/admin/product-features';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import {
  footerContactBlocks,
  footerCopyright,
  footerPaymentMethods,
} from '@/server/storefront/site-shell';
import type { HomeData, NavigationData, ProductListResult, ProductListSort, StorefrontCategory, StorefrontCompatibleGroup, StorefrontImage, StorefrontProductCard, StorefrontProductDetail } from './types';
import { brandNameSql, brandSlugSql } from '@/server/brands/resolve-brand-translation';
import {
  DEFAULT_PRODUCT_LOCALE,
  productCompareAtPriceSql,
  productCurrencyCodeSql,
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
      {
        key: 'category',
        label: 'Category',
        options: [],
      },
    ],
  };
}

async function getCategorySubtreeIds(categoryId: string): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(drizzleSql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM categories WHERE id = ${categoryId}
      UNION ALL
      SELECT child.id
      FROM categories child
      INNER JOIN subtree ON child.parent_id = subtree.id
      WHERE child.status = 'active'
    )
    SELECT id FROM subtree
  `);
  return (Array.isArray(rows) ? rows : []).map((row) => row.id);
}

function productInCategorySubtreeCondition(categoryIds: string[]) {
  if (!categoryIds.length) {
    return drizzleSql`false`;
  }

  return or(
    inArray(products.defaultCategoryId, categoryIds),
    exists(
      db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(and(
          eq(productCategories.productId, products.id),
          inArray(productCategories.categoryId, categoryIds),
        )),
    ),
  );
}

function productSoldQuantitySql(productIdColumn: typeof products.id) {
  return drizzleSql<number>`COALESCE((
    SELECT SUM(${orderItems.quantity})::int
    FROM ${orderItems}
    INNER JOIN ${orders} ON ${orders.id} = ${orderItems.orderId}
    WHERE ${orderItems.productId} = ${productIdColumn}
      AND ${orders.status} IN ('pending_processing', 'partially_shipped', 'shipped', 'completed')
  ), 0)`;
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
      return [desc(products.createdAt), desc(products.updatedAt), asc(productNameSql(products.id, locale))];
    case 'featured':
    default:
      return [
        desc(productSoldQuantitySql(products.id)),
        desc(products.createdAt),
        asc(productNameSql(products.id, locale)),
      ];
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

    const homeTranslationMap = await loadProductTranslationsByProductIds(dbProducts.map((item) => item.id));

    if (!dbProducts.length) {
      return defaultHomeData;
    }

    const dynamicCards = dbProducts.map((item) => {
      const translation = pickProductTranslation(homeTranslationMap.get(item.id), locale);
      return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      spu: item.spu,
      shortDescription: item.shortDescription,
      coverImage: resolveProductCoverImage(
        item.id,
        item.name,
        firstImageByProductId.get(item.id),
        translation?.payload,
      ),
      price: asMoney(item.price, item.currencyCode),
      compareAtPrice: item.compareAtPrice ? asMoney(item.compareAtPrice, item.currencyCode) : null,
      purchaseMode: item.purchaseMode,
      inStock: item.stockQuantity > 0,
      brand: item.brandId && item.brandName && item.brandSlug ? { id: item.brandId, name: item.brandName, slug: item.brandSlug } : null,
    };
    });

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
    utilityLinks: [],
    mainLinks: [],
    categories: items.slice(0, 6),
  };
}

export async function getCategories(localeInput?: string | null): Promise<StorefrontCategory[]> {
  const locale = catalogLocale(localeInput);
  try {
    const [rows, countRows, rollupRows] = await Promise.all([
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
      db.execute<{ category_id: string; total: number }>(drizzleSql`
        SELECT category_id, count(DISTINCT product_id)::int AS total
        FROM (
          SELECT default_category_id AS category_id, id AS product_id
          FROM products
          WHERE status = 'active' AND default_category_id IS NOT NULL
          UNION
          SELECT category_id, product_id
          FROM product_categories
          INNER JOIN products ON products.id = product_categories.product_id
          WHERE products.status = 'active'
        ) AS linked
        WHERE category_id IS NOT NULL
        GROUP BY category_id
      `),
      db.execute<{ root_id: string; total: number }>(drizzleSql`
        WITH RECURSIVE category_tree AS (
          SELECT id, parent_id, id AS root_id
          FROM categories
          WHERE status = 'active' AND parent_id IS NULL
          UNION ALL
          SELECT child.id, child.parent_id, category_tree.root_id
          FROM categories child
          INNER JOIN category_tree ON child.parent_id = category_tree.id
          WHERE child.status = 'active'
        ),
        product_links AS (
          SELECT category_id, product_id
          FROM (
            SELECT default_category_id AS category_id, id AS product_id
            FROM products
            WHERE status = 'active' AND default_category_id IS NOT NULL
            UNION
            SELECT category_id, product_id
            FROM product_categories
            INNER JOIN products ON products.id = product_categories.product_id
            WHERE products.status = 'active'
          ) AS linked
          WHERE category_id IS NOT NULL
        )
        SELECT category_tree.root_id, count(DISTINCT product_links.product_id)::int AS total
        FROM category_tree
        LEFT JOIN product_links ON product_links.category_id = category_tree.id
        GROUP BY category_tree.root_id
      `),
    ]);
    if (!rows.length) {
      return [];
    }

    const productCountByCategoryId = new Map(
      (Array.isArray(countRows) ? countRows : []).map((item) => [item.category_id, Number(item.total)]),
    );
    const rollupCountByRootId = new Map(
      (Array.isArray(rollupRows) ? rollupRows : []).map((item) => [item.root_id, Number(item.total)]),
    );

    return rows.map((item) => {
      const slug = item.slug ?? '';
      const directCount = productCountByCategoryId.get(item.id) ?? 0;
      const rollupProductCount = item.parentId
        ? undefined
        : (rollupCountByRootId.get(item.id) ?? directCount);

      return {
        id: item.id,
        name: item.name ?? '',
        slug,
        description: item.description,
        parentId: item.parentId,
        productCount: directCount,
        rollupProductCount,
        image: item.imageUrl ? { id: `${item.id}-img`, url: item.imageUrl, alt: item.name ?? '' } : null,
        isFeatured: item.isFeatured,
        featuredOrder: item.featuredOrder,
      };
    });
  } catch (error) {
    console.error('getCategories failed', error);
    return [];
  }
}

export async function getCategoryBySlug(slug: string, localeInput?: string | null): Promise<StorefrontCategory | null> {
  const items = await getCategories(localeInput);
  return items.find((item) => item.slug === slug) ?? null;
}

export async function getProductList(input: {
  keyword?: string;
  categorySlug?: string;
  productBoardKey?: string;
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

    const categorySubtreeIds = categoryId ? await getCategorySubtreeIds(categoryId) : [];
    const categoryFilter = categoryId ? productInCategorySubtreeCondition(categorySubtreeIds) : undefined;

    const sharedFacetFilters = [eq(products.status, 'active')];
    if (input.keyword) {
      const keywordFilter = or(
        ilike(productNameSql(products.id, locale), `%${input.keyword}%`),
        ilike(products.spu, `%${input.keyword}%`),
        ilike(productShortDescriptionSql(products.id, locale), `%${input.keyword}%`),
      );

      if (keywordFilter) {
        sharedFacetFilters.push(keywordFilter);
      }
    }

    if (input.inStockOnly) {
      sharedFacetFilters.push(drizzleSql`${productStockQuantitySql(products.id, locale)} > 0`);
    }

    if (input.productBoardKey) {
      sharedFacetFilters.push(eq(productBoardAssignments.boardKey, input.productBoardKey));
    }

    const filters = [...sharedFacetFilters];
    const purchaseModeFacetWhere = and(...sharedFacetFilters, categoryFilter);
    const categoryFacetWhere = and(
      ...sharedFacetFilters,
      input.purchaseMode ? eq(products.purchaseMode, input.purchaseMode) : undefined,
    );

    if (input.purchaseMode) {
      filters.push(eq(products.purchaseMode, input.purchaseMode));
    }

    if (categoryFilter) {
      filters.push(categoryFilter);
    }

    const baseWhere = and(...filters);

    const productListSelect = {
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
    };

    const listFrom = input.productBoardKey
      ? db
          .select(productListSelect)
          .from(products)
          .innerJoin(productBoardAssignments, eq(productBoardAssignments.productId, products.id))
          .leftJoin(brands, eq(products.brandId, brands.id))
      : db
          .select(productListSelect)
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id));

    const rows = await listFrom
      .where(baseWhere)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    const countFrom = input.productBoardKey
      ? db
          .select({ total: count() })
          .from(products)
          .innerJoin(productBoardAssignments, eq(productBoardAssignments.productId, products.id))
      : db.select({ total: count() }).from(products);

    const countRows = await countFrom.where(baseWhere);

    const facetFrom = input.productBoardKey
      ? db
          .select({ purchaseMode: products.purchaseMode, total: count() })
          .from(products)
          .innerJoin(productBoardAssignments, eq(productBoardAssignments.productId, products.id))
      : db.select({ purchaseMode: products.purchaseMode, total: count() }).from(products);

    const facetCountRows = await facetFrom.where(purchaseModeFacetWhere).groupBy(products.purchaseMode);

    const categoryFacetPromise = input.keyword
      ? db.execute<{ slug: string; name: string; total: number }>(drizzleSql`
          WITH RECURSIVE category_tree AS (
            SELECT id, parent_id, id AS root_id
            FROM categories
            WHERE status = 'active' AND parent_id IS NULL
            UNION ALL
            SELECT child.id, child.parent_id, category_tree.root_id
            FROM categories child
            INNER JOIN category_tree ON child.parent_id = category_tree.id
            WHERE child.status = 'active'
          ),
          product_links AS (
            SELECT category_id, product_id
            FROM (
              SELECT default_category_id AS category_id, id AS product_id
              FROM products
              WHERE status = 'active' AND default_category_id IS NOT NULL
              UNION
              SELECT category_id, product_id
              FROM product_categories
              INNER JOIN products ON products.id = product_categories.product_id
              WHERE products.status = 'active'
            ) AS linked
            WHERE category_id IS NOT NULL
          ),
          matching_products AS (
            SELECT products.id
            FROM products
            ${input.productBoardKey ? drizzleSql`INNER JOIN product_board_assignments ON product_board_assignments.product_id = products.id` : drizzleSql``}
            WHERE ${categoryFacetWhere}
          )
          SELECT root.slug, root.name, count(DISTINCT matching_products.id)::int AS total
          FROM matching_products
          INNER JOIN product_links ON product_links.product_id = matching_products.id
          INNER JOIN category_tree ON category_tree.id = product_links.category_id
          INNER JOIN category_translations root
            ON root.category_id = category_tree.root_id
            AND root.locale = ${locale}
          GROUP BY root.slug, root.name
          ORDER BY root.name ASC
        `)
      : Promise.resolve([]);

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

    const listTranslationMap = await loadProductTranslationsByProductIds(rows.map((item) => item.id));

    const purchaseModeCounts = new Map(facetCountRows.map((row) => [row.purchaseMode, Number(row.total)]));
    const categoryFacetRows = await categoryFacetPromise;
    const categoryFacetOptions = (Array.isArray(categoryFacetRows) ? categoryFacetRows : []).map((row) => ({
      label: row.name,
      value: row.slug,
      count: Number(row.total),
    }));

    return {
      items: rows.map((item) => {
        const translation = pickProductTranslation(listTranslationMap.get(item.id), locale);
        return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        spu: item.spu,
        shortDescription: item.shortDescription,
        coverImage: resolveProductCoverImage(
          item.id,
          item.name,
          listImageByProductId.get(item.id),
          translation?.payload,
        ),
        price: asMoney(item.price, item.currencyCode),
        compareAtPrice: item.compareAtPrice ? asMoney(item.compareAtPrice, item.currencyCode) : null,
        purchaseMode: item.purchaseMode,
        inStock: item.stockQuantity > 0,
        brand: item.brandId && item.brandName && item.brandSlug ? { id: item.brandId, name: item.brandName, slug: item.brandSlug } : null,
      };
      }),
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
        {
          key: 'category',
          label: 'Category',
          options: categoryFacetOptions,
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

    const tableCover = images[0] ? toImage(images[0]) : null;
    const tableGallery = images.map(toImage);
    const payloadGallery = galleryFromPayload(product.id, product.name, product.payload);
    const coverImage = resolveProductCoverImage(product.id, product.name, tableCover, product.payload);
    const baseGallery = tableGallery.length ? tableGallery : payloadGallery;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      spu: product.spu,
      shortDescription: product.shortDescription,
      description: product.description ?? '',
      coverImage,
      gallery: mergeGalleryWithCover(baseGallery, coverImage),
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
