import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { LOCALE_REQUEST_HEADER, normalizeLocale } from '@/lib/i18n';
import { getCurrentUserId } from '@/server/auth/session';
import { buildQuoteCartPreview } from '@/server/storefront/cart';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const quoteNumber = request.nextUrl.searchParams.get('quoteNumber')?.trim();
  if (!quoteNumber) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'quoteNumber is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const locale = normalizeLocale(request.headers.get(LOCALE_REQUEST_HEADER));
  const result = await buildQuoteCartPreview({ quoteNumber, userId, locale });

  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result.detail, { headers: frontCorsHeaders() });
}
