import 'server-only';

import { asc, inArray } from 'drizzle-orm';

import { normalizeLocale, type Locale } from '@/lib/i18n';
import { db } from '@/server/db';
import { orderItems, productImages } from '@/server/db/schema';
import {
  loadProductTranslationsByProductIds,
  pickProductTranslation,
  resolveProductCoverImage,
} from '@/server/products/load-product-translations';

function profileLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

export async function enrichOrderItemsWithCoverImages(
  items: Array<typeof orderItems.$inferSelect>,
  localeInput?: string | null,
) {
  const locale = profileLocale(localeInput);
  const productIds = [...new Set(items.map((item) => item.productId))];

  const imageRows = productIds.length
    ? await db
        .select({
          productId: productImages.productId,
          id: productImages.id,
          url: productImages.url,
          alt: productImages.alt,
          width: productImages.width,
          height: productImages.height,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder))
    : [];

  const imageByProductId = new Map<string, (typeof imageRows)[number]>();
  for (const row of imageRows) {
    if (!imageByProductId.has(row.productId)) {
      imageByProductId.set(row.productId, row);
    }
  }

  const translationsByProductId = await loadProductTranslationsByProductIds(productIds);

  return items.map((item) => {
    const translation = pickProductTranslation(translationsByProductId.get(item.productId), locale);
    const imageRow = imageByProductId.get(item.productId);
    const coverImage = resolveProductCoverImage(
      item.productId,
      item.productName,
      imageRow
        ? {
            id: imageRow.id,
            url: imageRow.url,
            alt: imageRow.alt,
            width: imageRow.width,
            height: imageRow.height,
          }
        : undefined,
      translation?.payload,
    );

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.spu,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      coverImage,
    };
  });
}
