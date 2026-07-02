import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getProductListByBoard } from '@/server/storefront/product-boards';
import type { ProductListSort } from '@/server/storefront/types';

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parseProductListSort(value: string | null): ProductListSort | undefined {
  if (value === 'featured' || value === 'name-asc' || value === 'price-asc' || value === 'price-desc' || value === 'newest') {
    return value;
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string }> },
) {
  const { boardKey } = await params;
  const locale = resolveFrontRequestLocale(request);
  const searchParams = request.nextUrl.searchParams;
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize') ?? searchParams.get('page_size'), 12);
  const sort = parseProductListSort(searchParams.get('sort'));
  const purchaseMode = searchParams.get('purchaseMode') ?? searchParams.get('purchase_mode');
  const inStockOnly = searchParams.get('inStockOnly') === 'true' || searchParams.get('in_stock_only') === 'true';

  const result = await getProductListByBoard(boardKey, {
    page,
    pageSize,
    sort,
    purchaseMode: purchaseMode === 'buy' || purchaseMode === 'inquiry' ? purchaseMode : undefined,
    inStockOnly,
    locale,
  });

  if (!result) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Product board not found or disabled' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  const { boardKey: resolvedBoardKey, boardTitle, items, meta, facets } = result;
  return NextResponse.json(
    { locale, boardKey: resolvedBoardKey, boardTitle, items, meta, facets },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
