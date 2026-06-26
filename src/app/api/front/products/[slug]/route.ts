import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getProductBySlug } from '@/server/storefront';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = resolveFrontRequestLocale(request);
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json({ locale, ...product }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
