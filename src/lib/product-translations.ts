import { and, eq } from 'drizzle-orm';
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n';
import { db } from '@/server/db';
import { productTranslations } from '@/server/db/schema';

const productTranslationCache = new Map<string, ProductTranslation>();

export type ProductTranslation = {
  productId: string;
  locale: Locale;
  name?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function getProductTranslation(
  productId: string,
  locale: Locale,
  fallback = true
): Promise<ProductTranslation | null> {
  const cacheKey = `${productId}_${locale}`;
  const cached = productTranslationCache.get(cacheKey);
  if (cached) return cached;

  try {
    let row = null;
    if (db) {
      const [found] = await db
        .select()
        .from(productTranslations)
        .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, locale)))
        .limit(1);
      row = found ?? null;
    }

    if (row) {
      const translation: ProductTranslation = {
        productId: row.productId,
        locale: row.locale as Locale,
        name: row.name,
        shortDescription: row.shortDescription,
        description: row.description,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
      };
      productTranslationCache.set(cacheKey, translation);
      return translation;
    }

    if (fallback && locale !== DEFAULT_LOCALE) {
      return getProductTranslation(productId, DEFAULT_LOCALE, false);
    }

    return null;
  } catch (error) {
    console.error(`Failed to load product translation for ${productId} (${locale}):`, error);
    return null;
  }
}

/**
 * Get localized product name
 */
export async function getLocalizedProductName(
  product: { id: string; name: string },
  locale: Locale
): Promise<string> {
  const translation = await getProductTranslation(product.id, locale);
  return translation?.name || product.name;
}

/**
 * Get localized product description
 */
export async function getLocalizedProductDescription(
  product: { id: string; description?: string | null },
  locale: Locale
): Promise<string | null> {
  const translation = await getProductTranslation(product.id, locale);
  return translation?.description || product.description || null;
}

/**
 * Bulk load product translations for efficiency
 */
export async function getProductTranslations(
  productIds: string[],
  locale: Locale
): Promise<Map<string, ProductTranslation>> {
  const results = new Map<string, ProductTranslation>();
  
  // Load in parallel
  const promises = productIds.map(async (id) => {
    const translation = await getProductTranslation(id, locale);
    if (translation) {
      results.set(id, translation);
    }
  });
  
  await Promise.all(promises);
  return results;
}

/**
 * Clear translation cache (useful after admin updates)
 */
export function clearProductTranslationCache(productId?: string) {
  if (productId) {
    // Clear specific product
    for (const locale of ['en', 'de', 'es']) {
      productTranslationCache.delete(`${productId}_${locale}`);
    }
  } else {
    // Clear all
    productTranslationCache.clear();
  }
}

/**
 * Preload translations for better performance
 */
export async function preloadProductTranslations(
  productIds: string[],
  locales: Locale[] = ['en', 'de', 'es']
) {
  const promises = locales.flatMap((locale) =>
    productIds.map((id) => getProductTranslation(id, locale))
  );
  
  await Promise.all(promises);
}
