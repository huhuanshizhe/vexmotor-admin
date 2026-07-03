import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { normalizeLocale } from '@/lib/i18n';
import { resolveLocalizedPath } from '@/server/storefront/locale-path';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get('pathname')?.trim();
  const toLocale = normalizeLocale(request.nextUrl.searchParams.get('to'));

  if (!pathname) {
    return NextResponse.json(
      { code: 'BAD_REQUEST', message: 'pathname is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const path = await resolveLocalizedPath(pathname, toLocale);

  return NextResponse.json({ to: toLocale, path }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
