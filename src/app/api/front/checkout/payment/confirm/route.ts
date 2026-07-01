import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertCheckoutOrderAccess } from '@/server/payments/airwallex/order-access';
import { confirmAirwallexPaymentForOrder } from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';

import { frontCorsHeaders } from '@/lib/front-cors';

const bodySchema = z.object({
  orderNumber: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAirwallexConfigured()) {
    return NextResponse.json(
      { code: 'AIRWALLEX_NOT_CONFIGURED', message: 'Airwallex is not configured' },
      { status: 503, headers: frontCorsHeaders() },
    );
  }

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

  const result = await confirmAirwallexPaymentForOrder(access.order);
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.code,
        message: 'Payment is not completed yet',
        intentStatus: result.intentStatus ?? null,
        paymentStatus: result.paymentStatus ?? access.order.paymentStatus,
      },
      { status: 409, headers: frontCorsHeaders() },
    );
  }

  const redirectPath = access.userId
    ? `/account/orders/${parsed.data.orderNumber}`
    : `/checkout/confirmation/${parsed.data.orderNumber}`;

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
