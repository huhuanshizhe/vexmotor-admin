import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { orders } from '@/server/db/schema';
import { confirmAirwallexPaymentForOrder } from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';

export async function POST(request: NextRequest) {
  if (!isAirwallexConfigured()) {
    return NextResponse.json({ error: 'Airwallex webhook is not configured' }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const eventName = typeof payload.name === 'string' ? payload.name : '';
  const dataObject =
    payload.data && typeof payload.data === 'object' && payload.data !== null && 'object' in payload.data
      ? (payload.data as { object?: Record<string, unknown> }).object
      : null;

  if (eventName !== 'payment_intent.succeeded' || !dataObject) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderNumber =
    typeof dataObject.merchant_order_id === 'string' ? dataObject.merchant_order_id : null;
  const intentId = typeof dataObject.id === 'string' ? dataObject.id : null;

  if (!orderNumber) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (intentId && order.airwallexPaymentIntentId && order.airwallexPaymentIntentId !== intentId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  await confirmAirwallexPaymentForOrder(order);

  return NextResponse.json({ received: true, processed: true });
}
