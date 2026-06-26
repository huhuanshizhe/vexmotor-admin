import { NextRequest, NextResponse } from 'next/server';

import { parseOrderHistoryListQuery } from '@/lib/order-list-query';
import { listProcessedAdminOrders } from '@/server/admin/orders';

export async function GET(request: NextRequest) {
  const query = parseOrderHistoryListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const result = await listProcessedAdminOrders(query);
  return NextResponse.json({
    items: result.items,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
}
