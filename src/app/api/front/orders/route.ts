import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { listOrdersForUser } from '@/server/storefront/orders';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const params = request.nextUrl.searchParams;
  const page = Number(params.get('page') ?? '1');
  const pageSize = Number(params.get('pageSize') ?? '10');
  const q = params.get('q')?.trim() || undefined;
  const paymentStatus = params.get('paymentStatus')?.trim() as 'all' | 'unpaid' | 'paid' | undefined;
  const orderStatus = params.get('orderStatus')?.trim() as
    | 'all'
    | 'pending_processing'
    | 'partially_shipped'
    | 'shipped'
    | 'completed'
    | 'cancelled'
    | undefined;

  const result = await listOrdersForUser(userId, {
    page,
    pageSize,
    q,
    paymentStatus: paymentStatus === 'unpaid' || paymentStatus === 'paid' ? paymentStatus : 'all',
    orderStatus:
      orderStatus
      && ['pending_processing', 'partially_shipped', 'shipped', 'completed', 'cancelled'].includes(orderStatus)
        ? orderStatus
        : 'all',
  });

  return NextResponse.json(
    {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        placedAt: item.placedAt?.toISOString() ?? null,
      })),
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
