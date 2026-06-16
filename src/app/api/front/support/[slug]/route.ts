import { NextRequest, NextResponse } from 'next/server';

import { getSupportCatalog, getSupportPageBySlug } from '@/server/content/support';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await getSupportPageBySlug(slug);
  if (!article) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Article not found' }, { status: 404, headers: corsHeaders() });
  }
  return NextResponse.json(article, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
