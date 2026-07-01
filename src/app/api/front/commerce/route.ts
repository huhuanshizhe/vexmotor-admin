import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';

import { getCommerceConfig } from '@/server/commerce/config';

export async function GET() {
  const data = await getCommerceConfig();
  return NextResponse.json(data, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
