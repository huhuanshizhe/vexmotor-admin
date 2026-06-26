import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminUserId } from '@/server/auth/bearer';
import { addAdminOrderShipment } from '@/server/admin/orders';

const postSchema = z.object({
  trackingNumber: z.string().trim().min(1),
  shippedAt: z.string().datetime(),
  note: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { orderNumber } = await params;
  const updated = await addAdminOrderShipment({
    orderNumber,
    adminId,
    trackingNumber: parsed.data.trackingNumber,
    shippedAt: new Date(parsed.data.shippedAt),
    note: parsed.data.note,
    items: parsed.data.items,
  });

  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
