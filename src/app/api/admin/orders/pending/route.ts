import { NextRequest, NextResponse } from 'next/server';

import { parseOrderPendingListQuery } from '@/lib/order-list-query';
import { listPendingAdminOrders } from '@/server/admin/orders';

export async function GET(request: NextRequest) {
  const query = parseOrderPendingListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const items = await listPendingAdminOrders(query);
  return NextResponse.json({ items });
}
