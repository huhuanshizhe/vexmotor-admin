import { NextResponse } from 'next/server';
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
export async function GET() {
  const data = await getHomeData();
  return NextResponse.json(data);
}
