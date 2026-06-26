import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCategories } from '@/server/storefront';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const categories = await getCategories(locale);
  return NextResponse.json({ locale, categories }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
