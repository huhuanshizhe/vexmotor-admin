import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { getOrderByNumber } from '@/server/storefront/account';

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(userId, orderNumber);
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}
