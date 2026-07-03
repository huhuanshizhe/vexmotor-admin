import { NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getSiteSettings } from '@/server/site/settings';

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({
    defaultCurrencyCode: settings.defaultCurrencyCode,
    defaultCountryCode: settings.defaultCountryCode,
  }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
