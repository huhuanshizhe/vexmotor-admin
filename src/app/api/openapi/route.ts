import { NextResponse } from 'next/server';

import { getSwaggerSpec } from '@/lib/swagger';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getSwaggerSpec(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
