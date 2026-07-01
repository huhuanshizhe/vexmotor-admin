import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';

import { getKnowledgeCatalog } from '@/server/content/knowledge';

export async function GET() {
  const data = await getKnowledgeCatalog();
  return NextResponse.json(data, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
