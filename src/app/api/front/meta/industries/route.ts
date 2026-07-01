import { NextRequest, NextResponse } from 'next/server';

import { listCustomerIndustryOptions } from '@/lib/customer-industries';
import { frontCorsHeaders } from '@/lib/front-cors';

/**
 * @swagger
 * /api/front/meta/industries:
 *   get:
 *     tags: [Meta]
 *     summary: Customer industry options
 *     parameters:
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           enum: [en, zh]
 *         description: Label locale (defaults to en)
 *     responses:
 *       200:
 *         description: Industry option list
 */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale')?.trim().toLowerCase();
  const locale = localeParam === 'zh' ? 'zh' : 'en';
  const items = listCustomerIndustryOptions(locale);

  return NextResponse.json({ items }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
