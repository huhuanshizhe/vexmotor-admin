import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildCheckoutPaymentRedirectPath,
  confirmPaymentForOrder,
} from '@/server/payments/checkout-gateway';
import { assertCheckoutOrderAccess } from '@/server/payments/order-access';

import { frontCorsHeaders } from '@/lib/front-cors';

const bodySchema = z.object({
  orderNumber: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid payment confirm payload' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const access = await assertCheckoutOrderAccess(request, parsed.data.orderNumber);
  if (!access.ok) {
    return NextResponse.json(
      { code: access.code, message: 'Unable to access order for payment' },
      { status: access.status, headers: frontCorsHeaders() },
    );
  }

  const result = await confirmPaymentForOrder(access.order);
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.code,
        message: 'Payment is not completed yet',
        intentStatus: 'intentStatus' in result ? result.intentStatus ?? null : null,
        paymentStatus: 'paymentStatus' in result ? result.paymentStatus ?? access.order.paymentStatus : access.order.paymentStatus,
      },
      { status: 409, headers: frontCorsHeaders() },
    );
  }

  const redirectPath = buildCheckoutPaymentRedirectPath(parsed.data.orderNumber, access.userId);

  return NextResponse.json(
    {
      paymentStatus: result.paymentStatus,
      intentStatus: result.intentStatus,
      redirectPath,
      guestAccessToken: access.guestToken ?? undefined,
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
