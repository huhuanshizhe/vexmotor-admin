import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/server/db';
import { products } from '@/server/db/schema';

export const revalidate = 0;

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!db) {
    return NextResponse.json({ price: null, stockQuantity: 0, moq: 1, leadTimeMin: 3, leadTimeMax: 15, leadTimeUnit: 'business_days', inStock: false, purchaseMode: 'buy' }, { status: 200 });
  }

  try {
    const [product] = await db
      .select({
        price: products.price,
        currencyCode: products.currencyCode,
        stockQuantity: products.stockQuantity,
        moq: products.moq,
        leadTimeMin: products.leadTimeMin,
        leadTimeMax: products.leadTimeMax,
        leadTimeUnit: products.leadTimeUnit,
        purchaseMode: products.purchaseMode,
      })
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, 'active')))
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
  } catch {
    return NextResponse.json({ price: null, stockQuantity: 0, moq: 1, leadTimeMin: 3, leadTimeMax: 15, leadTimeUnit: 'business_days', inStock: false, purchaseMode: 'buy' }, { status: 200 });
  }
}
