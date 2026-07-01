import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';

import { getPressCatalog } from '@/server/content/press';

export async function GET() {
  const data = await getPressCatalog();
  return NextResponse.json(data, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
