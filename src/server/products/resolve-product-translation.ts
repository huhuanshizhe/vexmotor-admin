import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { normalizeSlug } from '@/lib/slug';

export { normalizeSlug as normalizeProductSlug };
export const DEFAULT_PRODUCT_LOCALE = 'en';

function productTranslationColumnSql(productIdColumn: SQLWrapper, column: string): SQL {
  return sql`COALESCE(
    (SELECT pt.${sql.raw(column)} FROM product_translations pt
      WHERE pt.product_id = ${productIdColumn} AND pt.locale = ${DEFAULT_PRODUCT_LOCALE} LIMIT 1),
    (SELECT pt.${sql.raw(column)} FROM product_translations pt
      WHERE pt.product_id = ${productIdColumn} ORDER BY pt.created_at ASC LIMIT 1)
  )`;
}

export function productNameSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'name') as SQL<string>;
}

export function productSlugSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'slug') as SQL<string>;
}

export function productShortDescriptionSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'short_description') as SQL<string | null>;
}

export function productPriceSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'price') as SQL<string>;
}

export function productCompareAtPriceSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'compare_at_price') as SQL<string | null>;
}

export function productCurrencyCodeSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'currency_code') as SQL<string>;
}

export function productStockQuantitySql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'stock_quantity') as SQL<number>;
}

export function productMoqSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'moq') as SQL<number>;
}

export function productLeadTimeMinSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_min') as SQL<number>;
}

export function productLeadTimeMaxSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_max') as SQL<number>;
}

export function productLeadTimeUnitSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_unit') as SQL<string>;
}

export function productDescriptionSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'description') as SQL<string | null>;
}

export function productDescriptionLongSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'description_long') as SQL<string | null>;
}

export function productSeoTitleSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'seo_title') as SQL<string | null>;
}

export function productSeoDescriptionSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'seo_description') as SQL<string | null>;
}

export function productLifecycleStatusSql(productIdColumn: SQLWrapper) {
  return productTranslationColumnSql(productIdColumn, 'lifecycle_status') as SQL<string>;
}

export function pickPrimaryProductLocale(locales: string[], preferredLocales: string[] = [DEFAULT_PRODUCT_LOCALE]) {
  for (const preferred of preferredLocales) {
    const match = locales.find((locale) => locale.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return [...locales].sort()[0] ?? DEFAULT_PRODUCT_LOCALE;
}
