import { NextRequest, NextResponse } from 'next/server';

import { isShippingContinentCode } from '@/lib/shipping-continents';
import { listGeoCountries, listGeoDivisions } from '@/server/geo/divisions';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const resource = searchParams.get('resource');

  if (resource === 'divisions') {
    const country = searchParams.get('country')?.trim().toUpperCase();
    if (!country) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'country is required' }, { status: 400 });
    }
    const parentId = searchParams.get('parentId');
    const items = await listGeoDivisions({ countryIso: country, parentId: parentId || null });
    return NextResponse.json({ items });
  }

  const continent = searchParams.get('continent')?.trim().toUpperCase();
  if (continent && !isShippingContinentCode(continent)) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid continent code' }, { status: 400 });
  }

  const items = await listGeoCountries(continent ? { continent } : undefined);
  return NextResponse.json({ items });
}
