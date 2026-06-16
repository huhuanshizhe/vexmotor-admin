import { NextRequest, NextResponse } from 'next/server';

import { getAdminProducts } from '@/server/admin/products';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const excludeId = request.nextUrl.searchParams.get('excludeId') ?? '';

  const { items } = await getAdminProducts(q);

  const filtered = excludeId ? items.filter((item) => item.id !== excludeId) : items;

  return NextResponse.json({
    items: filtered.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
    })),
  });
}
