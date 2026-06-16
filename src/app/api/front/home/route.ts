import { NextResponse } from 'next/server';
import { getHomeData } from '@/server/storefront';

export async function GET() {
  const data = await getHomeData();
  return NextResponse.json(data);
}
