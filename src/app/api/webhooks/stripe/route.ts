import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { orderActionLogs, orders } from '@/server/db/schema';

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function appendPaymentActionLog(orderId: string, actionType: 'status_change' | 'refund_processed', payload: Record<string, unknown>) {
  await db.insert(orderActionLogs).values({
    orderId,
    actionType,
    adminId: null,
    payload,
  });
}

export async function POST(request: NextRequest) {
  if (!stripeWebhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret is not configured' }, { status: 500 });
  }

  let Stripe: typeof import('stripe');
  try {
    Stripe = await import('stripe');
  } catch {
    return NextResponse.json({ error: 'Stripe SDK not available' }, { status: 500 });
  }

  const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-02-24.acacia' });
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await getRawBody(request);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderNumber = session.metadata?.orderNumber;

        if (orderNumber) {
          const [updated] = await db
            .update(orders)
            .set({
              status: 'pending_processing',
              paymentStatus: 'paid',
              paymentMethod: `stripe:${session.payment_method_types?.[0] ?? 'card'}`,
              placedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orders.orderNumber, orderNumber))
            .returning({ id: orders.id });

          if (updated) {
            await appendPaymentActionLog(updated.id, 'status_change', {
              source: 'stripe',
              event: event.type,
              to: 'pending_processing',
              paymentStatus: 'paid',
            });
          }

          console.log(`[stripe-webhook] Order ${orderNumber} marked as paid`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderNumber = paymentIntent.metadata?.orderNumber;

        if (orderNumber) {
          const [updated] = await db
            .update(orders)
            .set({
              status: 'pending_processing',
              paymentStatus: 'paid',
              updatedAt: new Date(),
            })
            .where(eq(orders.orderNumber, orderNumber))
            .returning({ id: orders.id });

          if (updated) {
            await appendPaymentActionLog(updated.id, 'status_change', {
              source: 'stripe',
              event: event.type,
              to: 'pending_processing',
              paymentStatus: 'paid',
            });
          }

          console.log(`[stripe-webhook] Payment intent succeeded for order ${orderNumber}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderNumber = paymentIntent.metadata?.orderNumber;

        if (orderNumber) {
          console.warn(`[stripe-webhook] Payment failed for order ${orderNumber}:`, paymentIntent.last_payment_error?.message);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const orderNumber = charge.metadata?.orderNumber;

        if (orderNumber) {
          const [updated] = await db
            .update(orders)
            .set({
              refundStatus: 'refunded',
              updatedAt: new Date(),
            })
            .where(eq(orders.orderNumber, orderNumber))
            .returning({ id: orders.id });

          if (updated) {
            await appendPaymentActionLog(updated.id, 'refund_processed', {
              source: 'stripe',
              event: event.type,
              refundStatus: 'refunded',
            });
          }

          console.log(`[stripe-webhook] Order ${orderNumber} marked as refunded`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[stripe-webhook] Error processing event ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true, processed: true });
}
