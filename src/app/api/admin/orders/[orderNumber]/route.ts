import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminOrderDetail, updateAdminOrder } from '@/server/admin/orders';

const patchSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded']).optional(),
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
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { orderNumber } = await params;
  const updated = await updateAdminOrder({
    orderNumber,
    status: parsed.data.status,
  });

  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}