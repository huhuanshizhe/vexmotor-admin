import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBoardContent, type StorefrontBoardContentModule } from '@/server/storefront/editorial-content';

function parseContentModule(value: string | null): StorefrontBoardContentModule {
  return value === 'faq' ? 'faq' : 'editorial';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string }> },
) {
  const { boardKey } = await params;
  const locale = resolveFrontRequestLocale(request);
  const module = parseContentModule(request.nextUrl.searchParams.get('module'));
  return NextResponse.json(
    await getStorefrontBoardContent(boardKey, locale, module),
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
