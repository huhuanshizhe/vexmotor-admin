import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/server/db';
import { orders } from '@/server/db/schema';
import { getCurrentUserId } from '@/server/auth/session';
import { createOrderFromCart, getOrCreateCart } from '@/server/storefront/cart';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json({ code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' }, { status: 503 });
  }

  let Stripe: typeof import('stripe');
  try {
    Stripe = await import('stripe');
  } catch {
    return NextResponse.json({ code: 'STRIPE_SDK_ERROR', message: 'Stripe SDK not available' }, { status: 500 });
  }

  const stripe = new Stripe.default(stripeSecretKey, { apiVersion: '2025-02-24.acacia' });
  const userId = await getCurrentUserId(request);
  const body = await request.json();
  const { orderNumber } = body;

  if (!orderNumber) {
    return NextResponse.json({ code: 'MISSING_ORDER', message: 'orderNumber is required' }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ code: 'DB_UNAVAILABLE', message: 'Database not available' }, { status: 503 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    return NextResponse.json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const anonymousToken = cookieStore.get('cart_token')?.value ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'http://localhost:4000';

  const orderItems = order.totalAmount ? Number(order.totalAmount) : 0;
  const lineItems = [
    {
      price_data: {
        currency: (order.currencyCode ?? 'usd').toLowerCase(),
        product_data: {
          name: `Order ${order.orderNumber}`,
          description: `${order.shippingMethod ?? 'Standard'} shipping`,
        },
        unit_amount: Math.round(orderItems * 100),
      },
      quantity: 1,
    },
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${siteUrl}/checkout/confirmation/${order.orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?cancelled=true&order=${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        userId: userId ?? 'guest',
      },
      customer_email: body.customerEmail ?? undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error) {
    console.error('[stripe-checkout] Failed to create session:', error);
    return NextResponse.json(
      { code: 'STRIPE_SESSION_ERROR', message: error instanceof Error ? error.message : 'Failed to create Stripe session' },
      { status: 500 },
    );
  }
}
