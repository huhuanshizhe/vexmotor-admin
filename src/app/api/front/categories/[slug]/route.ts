import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCategoryBySlug } from '@/server/storefront';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = resolveFrontRequestLocale(request);
  const category = await getCategoryBySlug(slug, locale);

  if (!category) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Category not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json({ locale, category }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
