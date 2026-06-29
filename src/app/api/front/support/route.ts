import { NextResponse } from 'next/server';

import { getSupportCatalog } from '@/server/content/support';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET() {
  const data = await getSupportCatalog();
  return NextResponse.json(data, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
