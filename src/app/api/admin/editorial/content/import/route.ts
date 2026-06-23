import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { code: 'REMOVED', message: 'Seed import has been removed. Editorial content is now managed as a single content type.' },
    { status: 410 },
  );
}
