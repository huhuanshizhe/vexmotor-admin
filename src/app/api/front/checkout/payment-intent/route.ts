import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensurePaymentIntentForOrder,
  isPaymentGatewayConfigured,
  resolveOrderPaymentGateway,
} from '@/server/payments/checkout-gateway';
import { resolveStripePublicKeyMode } from '@/server/payments/stripe/config';
import { assertCheckoutOrderAccess } from '@/server/payments/order-access';

import { frontCorsHeaders } from '@/lib/front-cors';

const bodySchema = z.object({
  orderNumber: z.string().min(1),
  customerEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
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

  if (!isPaymentGatewayConfigured(access.order)) {
    const gateway = resolveOrderPaymentGateway(access.order);
    return NextResponse.json(
      {
        code: gateway === 'airwallex' ? 'AIRWALLEX_NOT_CONFIGURED' : 'STRIPE_NOT_CONFIGURED',
        message: gateway === 'airwallex' ? 'Airwallex is not configured' : 'Stripe is not configured',
      },
      { status: 503, headers: frontCorsHeaders() },
    );
  }

  if (access.order.paymentStatus === 'paid') {
    return NextResponse.json(
      { code: 'ORDER_ALREADY_PAID', message: 'Order is already paid' },
      { status: 409, headers: frontCorsHeaders() },
    );
  }

  const result = await ensurePaymentIntentForOrder({
    order: access.order,
    customerEmail: parsed.data.customerEmail,
  });

  if (!result.ok) {
    const status =
      result.code === 'STRIPE_NOT_CONFIGURED' || result.code === 'AIRWALLEX_NOT_CONFIGURED'
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

  const publicKey = 'publicKey' in result ? result.publicKey : undefined;
  const airwallexEnv = 'env' in result ? result.env : undefined;
  const mode =
    result.gateway === 'stripe' && publicKey
      ? resolveStripePublicKeyMode(publicKey)
      : airwallexEnv === 'prod'
        ? 'live'
        : airwallexEnv === 'demo'
          ? 'test'
          : undefined;

  return NextResponse.json(
    {
      gateway: result.gateway,
      intentId: result.intentId,
      clientSecret: result.clientSecret,
      currency: result.currency,
      publicKey,
      env: airwallexEnv,
      mode,
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
