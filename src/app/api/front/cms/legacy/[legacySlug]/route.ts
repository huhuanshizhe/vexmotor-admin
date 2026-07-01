import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';

import { getCmsPageByLegacySlug } from '@/server/storefront/content';

export async function GET(request: NextRequest, { params }: { params: Promise<{ legacySlug: string }> }) {
  const { legacySlug } = await params;
  const locale = (request.headers.get('x-vex-locale') ?? 'en').slice(0, 2) as 'en' | 'de' | 'es';
  const page = await getCmsPageByLegacySlug(legacySlug, locale);

  if (!page) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Page not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(
    {
      ...page,
      publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    },
    { headers: frontCorsHeaders() },
  );
}
