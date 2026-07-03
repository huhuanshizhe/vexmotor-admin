import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCountryContinentByIso } from '@/server/geo/country-continents';

export async function GET() {
  const countryContinentByIso = await getCountryContinentByIso();
  return NextResponse.json({ countryContinentByIso }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
