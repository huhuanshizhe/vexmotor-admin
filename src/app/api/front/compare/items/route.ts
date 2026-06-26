import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { addCompareItemForUser, getCompareItemsByUser } from '@/server/storefront/compare';

const addSchema = z.object({
  productId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json(await getCompareItemsByUser(userId, locale), { headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid compare item payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await addCompareItemForUser(userId, parsed.data.productId);
  if (!result.ok) {
    const status = result.code === 'COMPARE_LIMIT' ? 409 : 404;
    return NextResponse.json({ code: result.code, message: result.message }, { status, headers: frontCorsHeaders() });
  }

  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json(await getCompareItemsByUser(userId, locale), { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
