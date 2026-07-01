import { NextRequest, NextResponse } from 'next/server';

import { getGuestOrderDetailByNumber } from '@/server/storefront/cart';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const guestToken =
    request.headers.get('x-guest-order-token')?.trim() ||
    request.nextUrl.searchParams.get('guestToken')?.trim() ||
    null;

  const order = await getGuestOrderDetailByNumber(orderNumber, guestToken);
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(order, { headers: frontCorsHeaders() });
}
