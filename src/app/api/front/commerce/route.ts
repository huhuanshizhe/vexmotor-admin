import { NextRequest, NextResponse } from 'next/server';

import { getCommerceConfig } from '@/server/commerce/config';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET() {
  const data = await getCommerceConfig();
  return NextResponse.json(data, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
