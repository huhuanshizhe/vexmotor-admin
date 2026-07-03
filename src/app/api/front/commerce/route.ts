import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontCommerceConfig } from '@/server/commerce/config';

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const data = await getStorefrontCommerceConfig(locale);
  return NextResponse.json(data, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
