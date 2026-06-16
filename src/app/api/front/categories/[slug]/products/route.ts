import { NextRequest, NextResponse } from 'next/server';

import { getProductList } from '@/server/storefront';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '12');

  const result = await getProductList({
    categorySlug: slug,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 12 : pageSize,
  });

  return NextResponse.json(result);
}
