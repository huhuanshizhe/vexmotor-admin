import { sql, type Column, type SQL } from 'drizzle-orm';

import { normalizeSlug } from '@/lib/slug';
import { correlatedColumnSql } from '@/server/db/correlated-column-sql';

export { normalizeSlug as normalizeProductSlug };
export const DEFAULT_PRODUCT_LOCALE = 'en';

function productTranslationColumnSql(
  productIdColumn: Column,
  column: string,
  locale: string = DEFAULT_PRODUCT_LOCALE,
): SQL {
  const outerProductId = correlatedColumnSql(productIdColumn);
  return sql`COALESCE(
    (SELECT pt.${sql.raw(column)} FROM product_translations pt
      WHERE pt.product_id = ${outerProductId} AND pt.locale = ${locale} LIMIT 1),
    (SELECT pt.${sql.raw(column)} FROM product_translations pt
      WHERE pt.product_id = ${outerProductId} AND pt.locale = ${DEFAULT_PRODUCT_LOCALE} LIMIT 1),
    (SELECT pt.${sql.raw(column)} FROM product_translations pt
      WHERE pt.product_id = ${outerProductId} ORDER BY pt.created_at ASC LIMIT 1)
  )`;
}

export function productNameSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'name', locale) as SQL<string>;
}

export function productSlugSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'slug', locale) as SQL<string>;
}

export function productShortDescriptionSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'short_description', locale) as SQL<string | null>;
}

export function productPriceSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'price', locale) as SQL<string>;
}

export function productCompareAtPriceSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'compare_at_price', locale) as SQL<string | null>;
}

export function productCurrencyCodeSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'currency_code', locale) as SQL<string>;
}

export function productStockQuantitySql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'stock_quantity', locale) as SQL<number>;
}

export function productMoqSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'moq', locale) as SQL<number>;
}

export function productLeadTimeMinSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_min', locale) as SQL<number>;
}

export function productLeadTimeMaxSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_max', locale) as SQL<number>;
}

export function productLeadTimeUnitSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'lead_time_unit', locale) as SQL<string>;
}

export function productDescriptionSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'description', locale) as SQL<string | null>;
}

export function productSeoTitleSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'seo_title', locale) as SQL<string | null>;
}

export function productSeoDescriptionSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'seo_description', locale) as SQL<string | null>;
}

export function productLifecycleStatusSql(productIdColumn: Column, locale: string = DEFAULT_PRODUCT_LOCALE) {
  return productTranslationColumnSql(productIdColumn, 'lifecycle_status', locale) as SQL<string>;
}

export function pickPrimaryProductLocale(locales: string[], preferredLocales: string[] = [DEFAULT_PRODUCT_LOCALE]) {
  for (const preferred of preferredLocales) {
    const match = locales.find((locale) => locale.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return [...locales].sort()[0] ?? DEFAULT_PRODUCT_LOCALE;
}
