import { NextRequest, NextResponse } from 'next/server';

import { getGuestOrderDetailByNumber } from '@/server/storefront/cart';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, X-Guest-Order-Token, x-vex-locale',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const guestToken =
    request.headers.get('x-guest-order-token')?.trim() ||
    request.nextUrl.searchParams.get('guestToken')?.trim() ||
    null;

  const order = await getGuestOrderDetailByNumber(orderNumber, guestToken);
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404, headers: corsHeaders() });
  }

  return NextResponse.json(order, { headers: corsHeaders() });
}
