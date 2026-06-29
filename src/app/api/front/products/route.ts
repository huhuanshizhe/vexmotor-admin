import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getProductList } from '@/server/storefront';
import type { ProductListSort } from '@/server/storefront/types';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '12');
  const sort = (searchParams.get('sort') ?? 'featured') as ProductListSort;
  const purchaseMode = searchParams.get('purchaseMode') === 'inquiry' ? 'inquiry' : searchParams.get('purchaseMode') === 'buy' ? 'buy' : undefined;

  const result = await getProductList({
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 12 : pageSize,
    sort,
    purchaseMode,
    inStockOnly: searchParams.get('inStockOnly') === 'true',
    locale,
  });

  return NextResponse.json({ locale, ...result }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
