import { NextRequest, NextResponse } from 'next/server';

import { getBlogCatalog, getBlogPostBySlug } from '@/server/content/blog';
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/i18n';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const locale = normalizeLocale(request.headers.get('x-vex-locale') ?? DEFAULT_LOCALE);
  const catalog = await getBlogCatalog(locale);
  const post = getBlogPostBySlug(catalog, slug);
  if (!post) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Post not found' }, { status: 404, headers: corsHeaders() });
  }
  return NextResponse.json(post, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
