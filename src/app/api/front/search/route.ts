import { NextRequest, NextResponse } from 'next/server';

import { getProductList } from '@/server/storefront';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '12');

  const result = await getProductList({
    keyword,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 12 : pageSize,
  });

  return NextResponse.json(result);
}
