import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getProductList } from '@/server/storefront';
import type { ProductListSort } from '@/server/storefront/types';

function readPurchaseMode(searchParams: URLSearchParams): 'buy' | 'inquiry' | undefined {
  const raw = searchParams.get('purchaseMode') ?? searchParams.get('mode');
  if (raw === 'buy' || raw === 'inquiry') {
    return raw;
  }
  return undefined;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = resolveFrontRequestLocale(request);
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '12');
  const sort = (searchParams.get('sort') ?? 'featured') as ProductListSort;
  const keyword = searchParams.get('keyword')?.trim() ?? searchParams.get('q')?.trim() ?? undefined;

  const result = await getProductList({
    categorySlug: slug,
    keyword,
    purchaseMode: readPurchaseMode(searchParams),
    sort,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 12 : pageSize,
    inStockOnly: searchParams.get('inStockOnly') === 'true',
    locale,
  });

  return NextResponse.json({ locale, ...result }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
