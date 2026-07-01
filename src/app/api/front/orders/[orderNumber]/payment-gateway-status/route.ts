import { NextRequest, NextResponse } from 'next/server';

import { assertCheckoutOrderAccess } from '@/server/payments/airwallex/order-access';
import { checkOrderPaymentGatewayStatus } from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;

  const access = await assertCheckoutOrderAccess(request, orderNumber);
  if (!access.ok) {
    return NextResponse.json(
      { code: access.code, message: 'Unable to access order for payment' },
      { status: access.status, headers: frontCorsHeaders() },
    );
  }

  if (!isAirwallexConfigured()) {
    return NextResponse.json(
      {
        code: 'AIRWALLEX_NOT_CONFIGURED',
        message: 'Airwallex is not configured',
        orderNumber,
        sitePaymentStatus: access.order.paymentStatus,
        orderStatus: access.order.status,
        gatewayConfigured: false,
        gatewayIntentId: access.order.airwallexPaymentIntentId ?? null,
        gatewayStatus: null,
        isPaidAtGateway: false,
        synced: false,
        redirectPath: access.userId
          ? `/account/orders/${orderNumber}`
          : `/checkout/confirmation/${orderNumber}`,
      },
      { status: 503, headers: frontCorsHeaders() },
    );
  }

  try {
    const status = await checkOrderPaymentGatewayStatus(access.order, { userId: access.userId });
    return NextResponse.json(status, { headers: frontCorsHeaders() });
  } catch (error) {
    return NextResponse.json(
      {
        code: 'PAYMENT_GATEWAY_STATUS_FAILED',
        message: error instanceof Error ? error.message : 'Unable to check payment gateway status',
      },
      { status: 502, headers: frontCorsHeaders() },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
