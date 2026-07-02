import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getFrontUiStrings } from '@/server/admin/ui-strings';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get('locale') ?? 'en';
  const keys = searchParams.get('keys')?.split(',').map((item) => item.trim()).filter(Boolean);
  const groups = searchParams.get('groups')?.split(',').map((item) => item.trim()).filter(Boolean);

  const payload = await getFrontUiStrings({ locale, keys, groups });
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
