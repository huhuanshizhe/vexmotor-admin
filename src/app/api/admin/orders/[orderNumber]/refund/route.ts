import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminUserId } from '@/server/auth/bearer';
import { processAdminOrderRefund } from '@/server/admin/orders';

const patchSchema = z.object({
  refundStatus: z.enum(['refunded', 'partially_refunded', 'refund_rejected']),
  refundedAmount: z.string().optional(),
});

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

  if (parsed.data.refundStatus === 'partially_refunded' && !parsed.data.refundedAmount?.trim()) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Partial refund amount is required' }, { status: 400 });
  }

  const { orderNumber } = await params;

  try {
    const updated = await processAdminOrderRefund({
      orderNumber,
      adminId,
      refundStatus: parsed.data.refundStatus,
      refundedAmount: parsed.data.refundedAmount?.trim() ?? null,
    });

    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'REFUND_NOT_PENDING') {
        return NextResponse.json({ code: 'REFUND_NOT_PENDING', message: 'No pending refund request' }, { status: 400 });
      }
      if (error.message === 'INVALID_REFUND_AMOUNT') {
        return NextResponse.json({ code: 'INVALID_REFUND_AMOUNT', message: 'Invalid refund amount' }, { status: 400 });
      }
      if (error.message === 'REFUND_AMOUNT_TOO_HIGH') {
        return NextResponse.json({ code: 'REFUND_AMOUNT_TOO_HIGH', message: 'Refund amount must be less than order total' }, { status: 400 });
      }
    }
    throw error;
  }
}
