import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getProductList } from '@/server/storefront';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '12');

  const result = await getProductList({
    keyword,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 12 : pageSize,
    locale,
  });

  return NextResponse.json({ locale, ...result }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
