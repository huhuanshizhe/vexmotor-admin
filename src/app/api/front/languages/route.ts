import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getStorefrontLanguages } from '@/server/storefront/languages';

export async function GET() {
  const languages = await getStorefrontLanguages();
  return NextResponse.json({ languages }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
