import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function POST() {
  return NextResponse.json({ ok: true }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
