import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { buildProductCompare } from '@/server/storefront/compare';

const compareSchema = z.object({
  productIds: z.array(z.string().uuid()).min(2).max(4),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid compare payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const locale = resolveFrontRequestLocale(request);
  const result = await buildProductCompare(parsed.data.productIds, locale);
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ code: result.code, message: result.message }, { status, headers: frontCorsHeaders() });
  }

  const { ok: _ok, ...payload } = result;
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
