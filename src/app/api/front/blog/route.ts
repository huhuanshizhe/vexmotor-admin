import { NextRequest, NextResponse } from 'next/server';

import { getBlogCatalog } from '@/server/content/blog';
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/i18n';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.headers.get('x-vex-locale') ?? DEFAULT_LOCALE);
  const data = await getBlogCatalog(locale);
  return NextResponse.json(data, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
