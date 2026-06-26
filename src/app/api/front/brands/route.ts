import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBrands } from '@/server/storefront/brands';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json(await getStorefrontBrands(locale), { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
