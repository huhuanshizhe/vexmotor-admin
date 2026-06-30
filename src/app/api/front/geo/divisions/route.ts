import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { listGeoDivisions } from '@/server/geo/divisions';

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')?.trim().toUpperCase();
  if (!country) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'country is required' }, { status: 400, headers: frontCorsHeaders() });
  }

  const parentId = request.nextUrl.searchParams.get('parentId');
  const items = await listGeoDivisions({ countryIso: country, parentId: parentId || null });
  return NextResponse.json({
    items: items.map((row) => ({
      id: row.id,
      code: row.code,
      level: row.level,
      nameEn: row.nameEn,
      nameZh: row.nameZh,
      label: row.nameZh ? `${row.nameEn} (${row.nameZh})` : row.nameEn,
    })),
  }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
