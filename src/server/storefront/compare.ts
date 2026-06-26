import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';

import { normalizeLocale, type Locale } from '@/lib/i18n';
import { getStorefrontProductFeatures } from '@/server/admin/product-features';
import { brandNameSql } from '@/server/brands/resolve-brand-translation';
import { categoryNameSql } from '@/server/categories/resolve-category-translation';
import { db } from '@/server/db';
import { brands, categories, compareItems, productCategories, products } from '@/server/db/schema';
import {
  productCurrencyCodeSql,
  productNameSql,
  productPriceSql,
  productSlugSql,
  productStockQuantitySql,
} from '@/server/products/resolve-product-translation';

export const MAX_COMPARE_ITEMS = 4;

function compareLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

function formatCompareMoney(amount: string | number, currencyCode: string) {
  const numeric = Number(amount ?? 0);
  return {
    currency: currencyCode,
    amount: numeric,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(Number.isFinite(numeric) ? numeric : 0),
  };
}

type CompareProductSummary = {
  id: string;
  name: string;
  slug: string;
  spu: string;
  brand: string | null;
  category: string | null;
  price: ReturnType<typeof formatCompareMoney>;
  stockQuantity: number;
  inStock: boolean;
  purchaseMode: string;
};

async function loadCompareProductSummaries(productIds: string[], localeInput?: string | null) {
  const locale = compareLocale(localeInput);
  if (!productIds.length) return [];

  const rows = await db
    .select({
      id: products.id,
      name: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      purchaseMode: products.purchaseMode,
      price: productPriceSql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      stockQuantity: productStockQuantitySql(products.id, locale),
      brandName: brandNameSql(brands.id, locale),
      categoryName: categoryNameSql(categories.id, locale),
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productCategories, eq(productCategories.productId, products.id))
    .leftJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(inArray(products.id, productIds), eq(products.status, 'active')));

  const summaryMap = new Map<string, CompareProductSummary>();
  for (const row of rows) {
    const existing = summaryMap.get(row.id);
    const summary: CompareProductSummary = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      spu: row.spu,
      brand: row.brandName,
      category: existing?.category ?? row.categoryName,
      price: formatCompareMoney(row.price, row.currencyCode),
      stockQuantity: row.stockQuantity,
      inStock: row.stockQuantity > 0,
      purchaseMode: row.purchaseMode,
    };
    summaryMap.set(row.id, summary);
  }

  return productIds
    .map((id) => summaryMap.get(id))
    .filter((item): item is CompareProductSummary => Boolean(item));
}

export async function getCompareItemsByUser(userId: string, localeInput?: string | null) {
  const locale = compareLocale(localeInput);
  const rows = await db
    .select({
      id: compareItems.id,
      productId: compareItems.productId,
      sortOrder: compareItems.sortOrder,
      createdAt: compareItems.createdAt,
    })
    .from(compareItems)
    .where(eq(compareItems.userId, userId))
    .orderBy(asc(compareItems.sortOrder), desc(compareItems.createdAt));

  const productIds = rows.map((row) => row.productId);
  const summaries = await loadCompareProductSummaries(productIds, locale);
  const summaryById = new Map(summaries.map((item) => [item.id, item]));

  return {
    locale,
    items: rows
      .map((row) => {
        const product = summaryById.get(row.productId);
        if (!product) return null;
        return {
          id: row.id,
          productId: row.productId,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          product,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

export async function addCompareItemForUser(userId: string, productId: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, 'active')))
    .limit(1);

  if (!product) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Product not found' };
  }

  const [existing] = await db
    .select({ id: compareItems.id })
    .from(compareItems)
    .where(and(eq(compareItems.userId, userId), eq(compareItems.productId, productId)))
    .limit(1);

  if (existing) {
    return { ok: true as const, created: false as const };
  }

  const [itemCount] = await db
    .select({ total: count() })
    .from(compareItems)
    .where(eq(compareItems.userId, userId));

  if (Number(itemCount?.total ?? 0) >= MAX_COMPARE_ITEMS) {
    return {
      ok: false as const,
      code: 'COMPARE_LIMIT' as const,
      message: `Compare list cannot exceed ${MAX_COMPARE_ITEMS} products`,
    };
  }

  await db.insert(compareItems).values({ userId, productId });
  return { ok: true as const, created: true as const };
}

export async function removeCompareItemForUser(userId: string, productId: string) {
  const [deleted] = await db
    .delete(compareItems)
    .where(and(eq(compareItems.userId, userId), eq(compareItems.productId, productId)))
    .returning();

  return deleted ?? null;
}

type CompareMatrixRow = {
  key: string;
  label: string;
  group: string;
  values: string[];
  isDifferent: boolean;
};

export async function buildProductCompare(productIds: string[], localeInput?: string | null) {
  const locale = compareLocale(localeInput);
  const uniqueIds = [...new Set(productIds)];

  if (uniqueIds.length < 2 || uniqueIds.length > MAX_COMPARE_ITEMS) {
    return {
      ok: false as const,
      code: 'INVALID_PRODUCT_COUNT' as const,
      message: `Provide between 2 and ${MAX_COMPARE_ITEMS} product IDs`,
    };
  }

  const summaries = await loadCompareProductSummaries(uniqueIds, locale);
  if (summaries.length !== uniqueIds.length) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'One or more products were not found' };
  }

  const featuresByProduct = await Promise.all(
    summaries.map(async (product) => ({
      productId: product.id,
      features: await getStorefrontProductFeatures(product.id, locale),
    })),
  );

  const fixedRows: CompareMatrixRow[] = [
    {
      key: 'price',
      label: 'Price',
      group: 'Overview',
      values: summaries.map((product) => product.price.formatted),
      isDifferent: new Set(summaries.map((product) => product.price.formatted)).size > 1,
    },
    {
      key: 'brand',
      label: 'Brand',
      group: 'Overview',
      values: summaries.map((product) => product.brand ?? '—'),
      isDifferent: new Set(summaries.map((product) => product.brand ?? '—')).size > 1,
    },
    {
      key: 'category',
      label: 'Category',
      group: 'Overview',
      values: summaries.map((product) => product.category ?? '—'),
      isDifferent: new Set(summaries.map((product) => product.category ?? '—')).size > 1,
    },
    {
      key: 'stock',
      label: 'Stock',
      group: 'Overview',
      values: summaries.map((product) => (product.inStock ? `${product.stockQuantity} in stock` : 'Out of stock')),
      isDifferent: new Set(summaries.map((product) => String(product.inStock))).size > 1,
    },
    {
      key: 'purchaseMode',
      label: 'Purchase Mode',
      group: 'Overview',
      values: summaries.map((product) => product.purchaseMode),
      isDifferent: new Set(summaries.map((product) => product.purchaseMode)).size > 1,
    },
  ];

  const featureKeySet = new Set<string>();
  for (const entry of featuresByProduct) {
    for (const feature of entry.features) {
      featureKeySet.add(feature.key);
    }
  }

  const dynamicRows: CompareMatrixRow[] = [...featureKeySet].sort().map((key) => {
    const sample = featuresByProduct
      .flatMap((entry) => entry.features)
      .find((feature) => feature.key === key);
    const values = summaries.map((product) => {
      const feature = featuresByProduct
        .find((entry) => entry.productId === product.id)
        ?.features.find((item) => item.key === key);
      return feature?.value ?? '—';
    });

    return {
      key,
      label: key,
      group: sample?.category ?? 'Specifications',
      values,
      isDifferent: new Set(values).size > 1,
    };
  });

  const matrix = [...fixedRows, ...dynamicRows];
  const sharedFeatureKeys = matrix.filter((row) => !row.isDifferent).map((row) => row.key);
  const uniqueByProduct = summaries.map((product, index) => ({
    productId: product.id,
    keys: matrix.filter((row) => row.isDifferent && row.values[index] !== '—').map((row) => row.key),
  }));

  const groups = [...new Set(matrix.map((row) => row.group))].map((name) => ({
    name,
    rows: matrix.filter((row) => row.group === name).map((row) => row.key),
  }));

  return {
    ok: true as const,
    locale,
    products: summaries,
    groups,
    matrix,
    summary: {
      sharedFeatureKeys,
      uniqueByProduct,
    },
  };
}
