import { NextRequest, NextResponse } from 'next/server';

import { isShippingContinentCode } from '@/lib/shipping-continents';
import { frontCorsHeaders } from '@/lib/front-cors';
import { listGeoCountries } from '@/server/geo/divisions';

/**
 * @swagger
 * /api/front/geo/countries:
 *   get:
 *     tags: [Geo]
 *     summary: Enabled shipping countries
 *     parameters:
 *       - in: query
 *         name: continent
 *         schema:
 *           type: string
 *         description: Optional continent filter
 *     responses:
 *       200:
 *         description: Country list
 */
export async function GET(request: NextRequest) {
  const continent = request.nextUrl.searchParams.get('continent')?.trim().toUpperCase();
  if (continent && !isShippingContinentCode(continent)) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid continent code' }, { status: 400, headers: frontCorsHeaders() });
  }

  const items = await listGeoCountries(continent ? { continent } : undefined);
  return NextResponse.json({ items }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
