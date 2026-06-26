import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { orderStatuses } from '@/lib/order-status';
import { getAdminUserId } from '@/server/auth/bearer';
import { getAdminOrderDetail, updateAdminOrder } from '@/server/admin/orders';

const patchSchema = z.object({
  status: z.enum(orderStatuses).optional(),
  internalNote: z.string().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getAdminOrderDetail(orderNumber);
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { orderNumber } = await params;

  try {
    const updated = await updateAdminOrder({
      orderNumber,
      status: parsed.data.status,
      internalNote: parsed.data.internalNote,
      adminId,
    });

    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      return NextResponse.json({ code: 'INVALID_STATUS', message: 'Status cannot be set' }, { status: 400 });
    }
    throw error;
  }
}
