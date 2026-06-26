import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBoardFaqs } from '@/server/storefront/editorial-content';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string }> },
) {
  const { boardKey } = await params;
  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json(await getStorefrontBoardFaqs(boardKey, locale), { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
