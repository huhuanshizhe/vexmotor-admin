import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getHomeData } from '@/server/storefront';

/**
 * @swagger
 * /api/front/home:
 *   get:
 *     tags: [Home]
 *     summary: Homepage aggregated data
 *     responses:
 *       200:
 *         description: Home page payload
 */
export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const data = await getHomeData(locale);
  return NextResponse.json({ locale, ...data }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
