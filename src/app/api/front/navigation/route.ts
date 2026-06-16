import { NextResponse } from 'next/server';
import { getNavigationData } from '@/server/storefront';

export async function GET() {
  const data = await getNavigationData();
  return NextResponse.json(data);
}
