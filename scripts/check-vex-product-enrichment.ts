import '@/lib/env';

import { and, count, eq, gt, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/server/db';
import { attachments, productFeatures, productImages, products, productTranslations } from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

async function main() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  const [activeProductCountRow] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.status, 'active'));

  const [withImageRow] = await db
    .select({ total: sql<number>`count(distinct ${productImages.productId})` })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(eq(products.status, 'active'));

  const [withFeatureRow] = await db
    .select({ total: sql<number>`count(distinct ${productFeatures.productId})` })
    .from(productFeatures)
    .innerJoin(products, eq(products.id, productFeatures.productId))
    .where(eq(products.status, 'active'));

  const [withAttachmentRow] = await db
    .select({ total: sql<number>`count(distinct ${attachments.productId})` })
    .from(attachments)
    .innerJoin(products, eq(products.id, attachments.productId))
    .where(eq(products.status, 'active'));

  const missingRichData = await db
    .select({
      slug: productTranslations.slug,
      name: productTranslations.name,
      imageCount: sql<number>`count(distinct ${productImages.id})`,
      featureCount: sql<number>`count(distinct ${productFeatures.id})`,
      attachmentCount: sql<number>`count(distinct ${attachments.id})`,
    })
    .from(products)
    .innerJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, DEFAULT_PRODUCT_LOCALE)),
    )
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .leftJoin(productFeatures, eq(productFeatures.productId, products.id))
    .leftJoin(attachments, eq(attachments.productId, products.id))
    .where(eq(products.status, 'active'))
    .groupBy(products.id, productTranslations.slug, productTranslations.name)
    .having(
      sql`count(distinct ${productImages.id}) = 0 or count(distinct ${productFeatures.id}) = 0 or count(distinct ${attachments.id}) = 0`,
    )
    .orderBy(productTranslations.name);

  const richDataDistribution = await db
    .select({
      slug: productTranslations.slug,
      name: productTranslations.name,
      imageCount: sql<number>`count(distinct ${productImages.id})`,
      featureCount: sql<number>`count(distinct ${productFeatures.id})`,
      attachmentCount: sql<number>`count(distinct ${attachments.id})`,
    })
    .from(products)
    .innerJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, DEFAULT_PRODUCT_LOCALE)),
    )
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .leftJoin(productFeatures, eq(productFeatures.productId, products.id))
    .leftJoin(attachments, eq(attachments.productId, products.id))
    .where(eq(products.status, 'active'))
    .groupBy(products.id, productTranslations.slug, productTranslations.name)
    .orderBy(productTranslations.name);

  const productsWithMultipleImages = richDataDistribution.filter((item) => Number(item.imageCount) > 1).length;
  const productsWithMultipleAttachments = richDataDistribution.filter((item) => Number(item.attachmentCount) > 1).length;
  const richestProducts = [...richDataDistribution]
    .sort(
      (left, right) =>
        Number(right.imageCount) + Number(right.attachmentCount) + Number(right.featureCount) -
        (Number(left.imageCount) + Number(left.attachmentCount) + Number(left.featureCount)),
    )
    .slice(0, 10);

  console.log(
    JSON.stringify(
      {
        activeProducts: Number(activeProductCountRow?.total ?? 0),
        productsWithImages: Number(withImageRow?.total ?? 0),
        productsWithFeatures: Number(withFeatureRow?.total ?? 0),
        productsWithAttachments: Number(withAttachmentRow?.total ?? 0),
        productsWithMultipleImages,
        productsWithMultipleAttachments,
        productsMissingAnyRichData: missingRichData.length,
        sampleMissingProducts: missingRichData.slice(0, 10),
        richestProducts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
