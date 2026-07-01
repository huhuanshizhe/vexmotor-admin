import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUserId } from '@/server/auth/session';
import { createRefundRequestForUser } from '@/server/storefront/orders';

import { frontCorsHeaders } from '@/lib/front-cors';

const bodySchema = z.object({
  refundType: z.enum(['full_refund', 'partial_refund']),
  returnType: z.enum(['return_goods', 'no_return']),
  reason: z.string().min(1).max(2000),
  requestedAmount: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid refund request payload' }, { status: 400, headers: frontCorsHeaders() });
  }

  if (parsed.data.refundType === 'partial_refund' && !parsed.data.requestedAmount?.trim()) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Partial refund amount is required' }, { status: 400, headers: frontCorsHeaders() });
  }

  const { orderNumber } = await params;
  const result = await createRefundRequestForUser(userId, orderNumber, {
    refundType: parsed.data.refundType,
    returnType: parsed.data.returnType,
    reason: parsed.data.reason.trim(),
    requestedAmount: parsed.data.requestedAmount?.trim(),
  });

  if (!result.ok) {
    const status =
      result.code === 'NOT_FOUND'
        ? 404
        : result.code === 'NOT_PAID' || result.code === 'REFUND_NOT_AVAILABLE'
          ? 409
          : 400;

    const messageByCode: Record<string, string> = {
      NOT_PAID: 'Only paid orders can request a refund',
      REFUND_NOT_AVAILABLE: 'A refund request is already pending or completed',
      INVALID_REFUND_AMOUNT: 'Refund amount must be greater than zero and not exceed the order total',
      REASON_REQUIRED: 'Refund reason is required',
    };

    return NextResponse.json(
      { code: result.code, message: messageByCode[result.code] ?? 'Unable to submit refund request' },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(
    {
      refundStatus: result.refundStatus,
      refundRequest: {
        ...result.refundRequest,
        createdAt: result.refundRequest.createdAt.toISOString(),
        processedAt: result.refundRequest.processedAt?.toISOString() ?? null,
      },
    },
    { status: 201, headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
