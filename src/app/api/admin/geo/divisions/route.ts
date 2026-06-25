import { NextRequest, NextResponse } from 'next/server';

import { listGeoDivisions } from '@/server/geo/divisions';

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')?.trim().toUpperCase();
  if (!country) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'country is required' }, { status: 400 });
  }

  const parentId = request.nextUrl.searchParams.get('parentId');
  const items = await listGeoDivisions({ countryIso: country, parentId: parentId || null });
  return NextResponse.json({ items });
}
