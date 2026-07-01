import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertCheckoutOrderAccess } from '@/server/payments/airwallex/order-access';
import { ensureAirwallexPaymentIntentForOrder } from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';

import { frontCorsHeaders } from '@/lib/front-cors';

const bodySchema = z.object({
  orderNumber: z.string().min(1),
  customerEmail: z.string().email().optional(),
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
      { code: 'VALIDATION_ERROR', message: 'Invalid payment intent payload' },
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

  if (access.order.paymentStatus === 'paid') {
    return NextResponse.json(
      { code: 'ORDER_ALREADY_PAID', message: 'Order is already paid' },
      { status: 409, headers: frontCorsHeaders() },
    );
  }

  const result = await ensureAirwallexPaymentIntentForOrder({
    order: access.order,
    customerEmail: parsed.data.customerEmail,
  });

  if (!result.ok) {
    const status =
      result.code === 'AIRWALLEX_NOT_CONFIGURED'
        ? 503
        : result.code === 'AIRWALLEX_INSUFFICIENT_PERMISSIONS'
          ? 403
          : result.code === 'AIRWALLEX_CONFIGURATION_ERROR'
            ? 502
            : 502;

    return NextResponse.json(
      {
        code: result.code,
        message: 'message' in result && result.message ? result.message : 'Unable to create payment intent',
      },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(
    {
      intentId: result.intentId,
      clientSecret: result.clientSecret,
      currency: result.currency,
      env: result.env,
    },
    { headers: frontCorsHeaders() },
  );
}
