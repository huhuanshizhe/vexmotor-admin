import { asc, inArray } from 'drizzle-orm';

import { defaultProductPayload, type AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import { productTranslations } from '@/server/db/schema';
import type { StorefrontImage } from '@/server/storefront/types';

import { DEFAULT_PRODUCT_LOCALE } from './resolve-product-translation';

type ProductTranslationRow = typeof productTranslations.$inferSelect;

export async function loadProductTranslationsByProductIds(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, ProductTranslationRow[]>();
  }

  const rows = await db
    .select()
    .from(productTranslations)
    .where(inArray(productTranslations.productId, productIds))
    .orderBy(asc(productTranslations.locale));

  const grouped = new Map<string, ProductTranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.productId) ?? [];
    bucket.push(row);
    grouped.set(row.productId, bucket);
  }

  return grouped;
}

export function pickProductTranslation(
  translations: ProductTranslationRow[] | undefined,
  locale: string,
): ProductTranslationRow | null {
  if (!translations?.length) {
    return null;
  }

  return (
    translations.find((item) => item.locale === locale)
    ?? translations.find((item) => item.locale === DEFAULT_PRODUCT_LOCALE)
    ?? [...translations].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0]
    ?? null
  );
}

function normalizePayload(payload: unknown): AdminProductPayload {
  if (!payload || typeof payload !== 'object') {
    return defaultProductPayload();
  }

  return {
    ...defaultProductPayload(),
    ...(payload as AdminProductPayload),
  };
}

export function coverImageFromPayload(
  productId: string,
  productName: string,
  payload: unknown,
): StorefrontImage | null {
  const data = normalizePayload(payload);
  if (!data.coverUrl?.trim()) {
    return null;
  }

  return {
    id: `${productId}-cover`,
    url: data.coverUrl,
    alt: data.coverAlt?.trim() || productName,
    width: null,
    height: null,
  };
}

export function galleryFromPayload(
  productId: string,
  productName: string,
  payload: unknown,
): StorefrontImage[] {
  const data = normalizePayload(payload);
  return data.gallery
    .filter((item) => item.url?.trim())
    .map((item, index) => ({
      id: `${productId}-gallery-${index}`,
      url: item.url,
      alt: item.alt?.trim() || productName,
      width: item.width ?? null,
      height: item.height ?? null,
    }));
}

export function resolveProductCoverImage(
  productId: string,
  productName: string,
  tableImage: StorefrontImage | undefined | null,
  payload: unknown,
): StorefrontImage | null {
  const normalizedTableImage = tableImage?.url?.trim() ? tableImage : null;
  return normalizedTableImage ?? coverImageFromPayload(productId, productName, payload);
}
