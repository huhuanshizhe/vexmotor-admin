import { NextResponse } from 'next/server';

import { getAdminUserId } from '@/server/auth/bearer';
import { terminateAdminOrder } from '@/server/admin/orders';

export async function POST(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const { orderNumber } = await params;

  try {
    const updated = await terminateAdminOrder(orderNumber, adminId);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_TERMINATE') {
      return NextResponse.json({ code: 'CANNOT_TERMINATE', message: 'Order cannot be terminated' }, { status: 400 });
    }
    throw error;
  }
}
