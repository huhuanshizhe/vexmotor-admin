import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/server/db';
import { products, productTranslations } from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

export const revalidate = 0;

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product] = await db
    .select({
      price: productTranslations.price,
      currencyCode: productTranslations.currencyCode,
      stockQuantity: productTranslations.stockQuantity,
      moq: productTranslations.moq,
      leadTimeMin: productTranslations.leadTimeMin,
      leadTimeMax: productTranslations.leadTimeMax,
      leadTimeUnit: productTranslations.leadTimeUnit,
      purchaseMode: products.purchaseMode,
    })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(
      eq(productTranslations.slug, slug),
      eq(productTranslations.locale, DEFAULT_PRODUCT_LOCALE),
      eq(products.status, 'active'),
    ))
    .limit(1);

  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
  }

  const price = Number(product.price);
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currencyCode }).format(price);

  return NextResponse.json({
    price: { currency: product.currencyCode, amount: price, formatted },
    stockQuantity: product.stockQuantity,
    moq: product.moq ?? 1,
    leadTimeMin: product.leadTimeMin ?? 3,
    leadTimeMax: product.leadTimeMax ?? 15,
    leadTimeUnit: product.leadTimeUnit ?? 'business_days',
    inStock: product.stockQuantity > 0,
    purchaseMode: product.purchaseMode,
  });
}
