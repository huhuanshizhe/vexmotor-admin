import 'server-only';

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { db } from '@/server/db';
import { orderActionLogs, orders } from '@/server/db/schema';
import { convertCartAfterOrderPaid } from '@/server/storefront/cart';
import { resolveOrderCurrencyCode } from '@/server/storefront/order-currency';
import { orderTotalToStripeAmount, stripeAmountMatchesOrder } from '@/server/payments/stripe/amount';
import {
  cancelStripePaymentIntent,
  createStripePaymentIntent,
  retrieveStripePaymentIntent,
} from '@/server/payments/stripe/client';
import { getStripeConfig } from '@/server/payments/stripe/config';

const REUSABLE_INTENT_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
]);
const PAID_INTENT_STATUSES = new Set<Stripe.PaymentIntent.Status>(['succeeded', 'requires_capture']);

function isCardOnlyPaymentIntent(intent: Stripe.PaymentIntent) {
  const types = intent.payment_method_types ?? [];
  return types.length === 1 && types[0] === 'card';
}

function isIntentPaidAtGateway(intent: Stripe.PaymentIntent, order: typeof orders.$inferSelect) {
  const chargeCurrency = resolveOrderCurrencyCode(order);
  return (
    PAID_INTENT_STATUSES.has(intent.status)
    && intent.metadata?.orderNumber === order.orderNumber
    && typeof intent.amount === 'number'
    && stripeAmountMatchesOrder(intent.amount, order.totalAmount, chargeCurrency)
  );
}

function buildPaymentRedirectPath(orderNumber: string, userId?: string | null) {
  return userId ? `/account/orders/${orderNumber}` : `/checkout/confirmation/${orderNumber}`;
}

export type OrderPaymentGatewayStatus = {
  orderNumber: string;
  sitePaymentStatus: string;
  orderStatus: string;
  gatewayConfigured: boolean;
  gatewayIntentId: string | null;
  gatewayStatus: string | null;
  isPaidAtGateway: boolean;
  synced: boolean;
  redirectPath: string;
};

export async function checkStripePaymentGatewayStatus(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const config = await getStripeConfig();
  const redirectPath = buildPaymentRedirectPath(order.orderNumber, options?.userId);

  if (order.paymentStatus === 'paid') {
    return {
      orderNumber: order.orderNumber,
      sitePaymentStatus: 'paid' as const,
      orderStatus: order.status,
      gatewayConfigured: Boolean(config),
      gatewayIntentId: order.stripePaymentIntentId ?? null,
      gatewayStatus: 'succeeded' as const,
      isPaidAtGateway: true,
      synced: false,
      redirectPath,
    } satisfies OrderPaymentGatewayStatus;
  }

  if (!config || !order.stripePaymentIntentId) {
    return {
      orderNumber: order.orderNumber,
      sitePaymentStatus: order.paymentStatus,
      orderStatus: order.status,
      gatewayConfigured: Boolean(config),
      gatewayIntentId: order.stripePaymentIntentId ?? null,
      gatewayStatus: null,
      isPaidAtGateway: false,
      synced: false,
      redirectPath,
    } satisfies OrderPaymentGatewayStatus;
  }

  const intent = await retrieveStripePaymentIntent(order.stripePaymentIntentId);
  const isPaidAtGateway = isIntentPaidAtGateway(intent, order);
  let sitePaymentStatus: string = order.paymentStatus;
  let orderStatus: string = order.status;
  let synced = false;

  if (isPaidAtGateway) {
    const confirmResult = await confirmStripePaymentForOrder(order);
    if (confirmResult.ok) {
      sitePaymentStatus = 'paid';
      orderStatus = 'pending_processing';
      synced = !confirmResult.alreadyPaid;
    }
  }

  return {
    orderNumber: order.orderNumber,
    sitePaymentStatus,
    orderStatus,
    gatewayConfigured: true,
    gatewayIntentId: intent.id,
    gatewayStatus: intent.status,
    isPaidAtGateway,
    synced,
    redirectPath,
  } satisfies OrderPaymentGatewayStatus;
}

async function persistStripePaymentIntent(orderId: string, intentId: string) {
  await db
    .update(orders)
    .set({
      stripePaymentIntentId: intentId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

function mapStripePaymentIntentError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Stripe payment intent failed';
  return {
    ok: false as const,
    code: 'STRIPE_API_ERROR' as const,
    message,
  };
}

export async function ensureStripePaymentIntentForOrder(input: {
  order: typeof orders.$inferSelect;
  customerEmail?: string;
}) {
  const config = await getStripeConfig();
  if (!config) {
    return { ok: false as const, code: 'STRIPE_NOT_CONFIGURED' as const };
  }

  if (input.order.paymentStatus === 'paid') {
    return { ok: false as const, code: 'ORDER_ALREADY_PAID' as const };
  }

  const chargeCurrency = resolveOrderCurrencyCode(input.order);
  const amount = orderTotalToStripeAmount(input.order.totalAmount, chargeCurrency);

  if (input.order.stripePaymentIntentId) {
    try {
      const existing = await retrieveStripePaymentIntent(input.order.stripePaymentIntentId);

      if (
        existing.status === 'succeeded'
        && stripeAmountMatchesOrder(existing.amount, input.order.totalAmount, chargeCurrency)
        && existing.metadata?.orderNumber === input.order.orderNumber
      ) {
        await confirmStripePaymentForOrder(input.order);
        return { ok: false as const, code: 'ORDER_ALREADY_PAID' as const };
      }

      const currencyMatches = existing.currency.toUpperCase() === chargeCurrency;
      if (
        currencyMatches
        && isCardOnlyPaymentIntent(existing)
        && REUSABLE_INTENT_STATUSES.has(existing.status)
        && stripeAmountMatchesOrder(existing.amount, input.order.totalAmount, chargeCurrency)
        && existing.metadata?.orderNumber === input.order.orderNumber
        && existing.client_secret
      ) {
        return {
          ok: true as const,
          gateway: 'stripe' as const,
          intentId: existing.id,
          clientSecret: existing.client_secret,
          currency: existing.currency.toUpperCase(),
          publicKey: config.publicKey,
        };
      }

      if (existing.status !== 'succeeded' && existing.status !== 'canceled') {
        await cancelStripePaymentIntent(existing.id).catch(() => undefined);
      }
    } catch {
      // Fall through and create a fresh intent.
    }
  }

  try {
    const intent = await createStripePaymentIntent({
      amount,
      currency: chargeCurrency,
      orderNumber: input.order.orderNumber,
      customerEmail: input.customerEmail,
    });

    if (!intent.client_secret) {
      return {
        ok: false as const,
        code: 'STRIPE_API_ERROR' as const,
        message: 'Stripe did not return a client secret',
      };
    }

    await persistStripePaymentIntent(input.order.id, intent.id);

    return {
      ok: true as const,
      gateway: 'stripe' as const,
      intentId: intent.id,
      clientSecret: intent.client_secret,
      currency: intent.currency.toUpperCase(),
      publicKey: config.publicKey,
    };
  } catch (error: unknown) {
    return mapStripePaymentIntentError(error);
  }
}

export async function confirmStripePaymentForOrder(order: typeof orders.$inferSelect) {
  if (!order.stripePaymentIntentId) {
    return { ok: false as const, code: 'PAYMENT_INTENT_MISSING' as const };
  }

  const intent = await retrieveStripePaymentIntent(order.stripePaymentIntentId);

  const chargeCurrency = resolveOrderCurrencyCode(order);

  if (intent.metadata?.orderNumber !== order.orderNumber) {
    return { ok: false as const, code: 'PAYMENT_INTENT_MISMATCH' as const };
  }

  if (!stripeAmountMatchesOrder(intent.amount, order.totalAmount, chargeCurrency)) {
    return { ok: false as const, code: 'PAYMENT_AMOUNT_MISMATCH' as const };
  }

  if (!PAID_INTENT_STATUSES.has(intent.status)) {
    return {
      ok: false as const,
      code: 'PAYMENT_NOT_COMPLETED' as const,
      intentStatus: intent.status,
      paymentStatus: order.paymentStatus,
    };
  }

  if (order.paymentStatus === 'paid') {
    await convertCartAfterOrderPaid(order.cartId);
    return {
      ok: true as const,
      alreadyPaid: true as const,
      paymentStatus: 'paid' as const,
      intentStatus: intent.status,
    };
  }

  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      status: 'pending_processing',
      paymentMethod: 'Credit Card (Stripe)',
      updatedAt: now,
    })
    .where(eq(orders.id, order.id))
    .returning({ id: orders.id });

  if (updated) {
    await convertCartAfterOrderPaid(order.cartId);
    await db.insert(orderActionLogs).values({
      orderId: updated.id,
      actionType: 'status_change',
      adminId: null,
      payload: {
        source: 'stripe',
        event: 'payment_intent.succeeded',
        to: 'pending_processing',
        paymentStatus: 'paid',
        intentId: intent.id,
      },
    });
  }

  return {
    ok: true as const,
    alreadyPaid: false as const,
    paymentStatus: 'paid' as const,
    intentStatus: intent.status,
  };
}

export async function getStripePaymentStatusForOrder(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const status = await checkStripePaymentGatewayStatus(order, options);
  return {
    paymentStatus: status.sitePaymentStatus,
    intentStatus: status.gatewayStatus,
    orderStatus: status.orderStatus,
  };
}
