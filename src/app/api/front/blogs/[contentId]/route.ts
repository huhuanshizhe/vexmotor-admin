import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBlogDetail } from '@/server/storefront/editorial-content';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params;
  const locale = resolveFrontRequestLocale(request);
  const detail = await getStorefrontBlogDetail(contentId, locale);

  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Blog not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(detail, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
