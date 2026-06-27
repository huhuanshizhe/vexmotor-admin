import { NextRequest, NextResponse } from 'next/server';



import { frontCorsHeaders } from '@/lib/front-cors';

import { resolveFrontRequestLocale } from '@/lib/front-request-locale';

import { getProductList } from '@/server/storefront';



export async function GET(request: NextRequest) {

  const locale = resolveFrontRequestLocale(request);

  const searchParams = request.nextUrl.searchParams;

  const keyword = searchParams.get('keyword')?.trim() ?? '';

  const page = Number(searchParams.get('page') ?? '1');

  const pageSize = Number(searchParams.get('pageSize') ?? '12');



  if (!keyword) {

    return NextResponse.json(

      { code: 'VALIDATION_ERROR', message: 'Search keyword is required' },

      { status: 400, headers: frontCorsHeaders() },

    );

  }



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

