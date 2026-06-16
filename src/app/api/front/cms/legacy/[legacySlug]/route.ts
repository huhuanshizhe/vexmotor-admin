import { NextRequest, NextResponse } from 'next/server';

import { getCmsPageByLegacySlug } from '@/server/storefront/content';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ legacySlug: string }> }) {
  const { legacySlug } = await params;
  const locale = (request.headers.get('x-vex-locale') ?? 'en').slice(0, 2) as 'en' | 'de' | 'es';
  const page = await getCmsPageByLegacySlug(legacySlug, locale);

  if (!page) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Page not found' }, { status: 404, headers: corsHeaders() });
  }

  return NextResponse.json(
    {
      ...page,
      publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    },
    { headers: corsHeaders() },
  );
}
