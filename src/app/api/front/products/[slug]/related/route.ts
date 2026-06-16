import { NextResponse } from 'next/server';

import { getProductBySlug } from '@/server/storefront';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product.relatedProducts);
}
