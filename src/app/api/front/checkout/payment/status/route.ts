import { NextRequest, NextResponse } from 'next/server';

import { getPaymentStatusForOrder, isPaymentGatewayConfigured } from '@/server/payments/checkout-gateway';
import { assertCheckoutOrderAccess } from '@/server/payments/order-access';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get('orderNumber')?.trim();
  if (!orderNumber) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'orderNumber is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const access = await assertCheckoutOrderAccess(request, orderNumber);
  if (!access.ok) {
    return NextResponse.json(
      { code: access.code, message: 'Unable to access order for payment' },
      { status: access.status, headers: frontCorsHeaders() },
    );
  }

  if (!(await isPaymentGatewayConfigured(access.order))) {
    return NextResponse.json(
      { code: 'PAYMENT_GATEWAY_NOT_CONFIGURED', message: 'Payment gateway is not configured' },
      { status: 503, headers: frontCorsHeaders() },
    );
  }

  const status = await getPaymentStatusForOrder(access.order, { userId: access.userId });

  return NextResponse.json(status, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
