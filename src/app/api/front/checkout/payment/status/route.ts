import { NextRequest, NextResponse } from 'next/server';

import { assertCheckoutOrderAccess } from '@/server/payments/airwallex/order-access';
import { getAirwallexPaymentStatusForOrder } from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function GET(request: NextRequest) {
  if (!isAirwallexConfigured()) {
    return NextResponse.json(
      { code: 'AIRWALLEX_NOT_CONFIGURED', message: 'Airwallex is not configured' },
      { status: 503, headers: frontCorsHeaders() },
    );
  }

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

  const status = await getAirwallexPaymentStatusForOrder(access.order, { userId: access.userId });

  return NextResponse.json(status, { headers: frontCorsHeaders() });
}
