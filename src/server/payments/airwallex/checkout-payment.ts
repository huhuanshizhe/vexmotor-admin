import 'server-only';

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { orderActionLogs, orders } from '@/server/db/schema';
import { convertCartAfterOrderPaid } from '@/server/storefront/cart';
import { resolveOrderCurrencyCode } from '@/server/storefront/order-currency';
import { airwallexAmountMatchesOrder, orderTotalToAirwallexAmount } from '@/server/payments/airwallex/amount';
import {
  AirwallexApiError,
  cancelAirwallexPaymentIntent,
  createAirwallexPaymentIntent,
  retrieveAirwallexPaymentIntent,
  withAirwallexAuthRetry,
} from '@/server/payments/airwallex/client';
import { getAirwallexConfig } from '@/server/payments/airwallex/config';
import type { AirwallexPaymentIntent } from '@/server/payments/airwallex/types';

const REUSABLE_INTENT_STATUSES = new Set(['REQUIRES_PAYMENT_METHOD', 'REQUIRES_CUSTOMER_ACTION']);
const PAID_INTENT_STATUSES = new Set(['SUCCEEDED', 'REQUIRES_CAPTURE']);

function isIntentPaidAtGateway(
  intent: AirwallexPaymentIntent,
  order: typeof orders.$inferSelect,
) {
  const chargeCurrency = resolveOrderCurrencyCode(order);
  return (
    PAID_INTENT_STATUSES.has(intent.status)
    && intent.merchant_order_id === order.orderNumber
    && airwallexAmountMatchesOrder(intent.amount, order.totalAmount, chargeCurrency)
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

export async function checkOrderPaymentGatewayStatus(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const config = await getAirwallexConfig();
  const redirectPath = buildPaymentRedirectPath(order.orderNumber, options?.userId);

  if (order.paymentStatus === 'paid') {
    return {
      orderNumber: order.orderNumber,
      sitePaymentStatus: 'paid' as const,
      orderStatus: order.status,
      gatewayConfigured: Boolean(config),
      gatewayIntentId: order.airwallexPaymentIntentId ?? null,
      gatewayStatus: 'SUCCEEDED' as const,
      isPaidAtGateway: true,
      synced: false,
      redirectPath,
    } satisfies OrderPaymentGatewayStatus;
  }

  if (!config || !order.airwallexPaymentIntentId) {
    return {
      orderNumber: order.orderNumber,
      sitePaymentStatus: order.paymentStatus,
      orderStatus: order.status,
      gatewayConfigured: Boolean(config),
      gatewayIntentId: order.airwallexPaymentIntentId ?? null,
      gatewayStatus: null,
      isPaidAtGateway: false,
      synced: false,
      redirectPath,
    } satisfies OrderPaymentGatewayStatus;
  }

  const intent = await withAirwallexAuthRetry(() =>
    retrieveAirwallexPaymentIntent(order.airwallexPaymentIntentId!),
  );

  const isPaidAtGateway = isIntentPaidAtGateway(intent, order);
  let sitePaymentStatus: string = order.paymentStatus;
  let orderStatus: string = order.status;
  let synced = false;

  if (isPaidAtGateway) {
    const confirmResult = await confirmAirwallexPaymentForOrder(order);
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

function mapAirwallexPaymentIntentError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Airwallex payment intent failed';
  const code = error instanceof AirwallexApiError ? error.code : undefined;

  if (code === 'configuration_error' || /merchant configuration/i.test(message)) {
    return {
      ok: false as const,
      code: 'AIRWALLEX_CONFIGURATION_ERROR' as const,
      message:
        'Airwallex merchant is not configured for card checkout. In Sandbox: enable Online Payments / Card for your API key.',
    };
  }

  if (/insufficient permissions/i.test(message)) {
    return {
      ok: false as const,
      code: 'AIRWALLEX_INSUFFICIENT_PERMISSIONS' as const,
      message:
        'Airwallex API key lacks Payment Acceptance permission. Enable it in Airwallex Console → Developers → API keys.',
    };
  }

  if (code === 'currency_not_supported' || /currency/i.test(message)) {
    return {
      ok: false as const,
      code: 'AIRWALLEX_CURRENCY_NOT_SUPPORTED' as const,
      message,
    };
  }

  return {
    ok: false as const,
    code: 'AIRWALLEX_API_ERROR' as const,
    message,
  };
}

async function persistPaymentIntent(orderId: string, intent: AirwallexPaymentIntent) {
  await db
    .update(orders)
    .set({
      airwallexPaymentIntentId: intent.id,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

export async function ensureAirwallexPaymentIntentForOrder(input: {
  order: typeof orders.$inferSelect;
  customerEmail?: string;
}) {
  const config = await getAirwallexConfig();
  if (!config) {
    return { ok: false as const, code: 'AIRWALLEX_NOT_CONFIGURED' as const };
  }

  if (input.order.paymentStatus === 'paid') {
    return { ok: false as const, code: 'ORDER_ALREADY_PAID' as const };
  }

  const chargeCurrency = resolveOrderCurrencyCode(input.order);
  const amount = orderTotalToAirwallexAmount(input.order.totalAmount, chargeCurrency);

  if (input.order.airwallexPaymentIntentId) {
    try {
      const existing = await withAirwallexAuthRetry(() =>
        retrieveAirwallexPaymentIntent(input.order.airwallexPaymentIntentId!),
      );

      if (
        existing.status === 'SUCCEEDED'
        && airwallexAmountMatchesOrder(existing.amount, input.order.totalAmount, chargeCurrency)
        && existing.merchant_order_id === input.order.orderNumber
      ) {
        await confirmAirwallexPaymentForOrder(input.order);
        return { ok: false as const, code: 'ORDER_ALREADY_PAID' as const };
      }

      const currencyMatches = existing.currency.toUpperCase() === chargeCurrency;
      if (
        currencyMatches
        && REUSABLE_INTENT_STATUSES.has(existing.status)
        && airwallexAmountMatchesOrder(existing.amount, input.order.totalAmount, chargeCurrency)
        && existing.merchant_order_id === input.order.orderNumber
        && existing.client_secret
      ) {
        return {
          ok: true as const,
          intentId: existing.id,
          clientSecret: existing.client_secret,
          currency: existing.currency,
          env: config.env,
        };
      }

      if (existing.status !== 'SUCCEEDED' && existing.status !== 'CANCELLED') {
        await withAirwallexAuthRetry(() =>
          cancelAirwallexPaymentIntent(existing.id, randomUUID()),
        ).catch(() => undefined);
      }
    } catch {
      // Fall through and create a fresh intent.
    }
  }

  const intent = await withAirwallexAuthRetry(() =>
    createAirwallexPaymentIntent({
      requestId: randomUUID(),
      amount,
      currency: chargeCurrency,
      merchantOrderId: input.order.orderNumber,
      customerEmail: input.customerEmail,
    }),
  ).catch((error: unknown) => mapAirwallexPaymentIntentError(error));

  if (!('id' in intent)) {
    return intent;
  }

  await persistPaymentIntent(input.order.id, intent);

  return {
    ok: true as const,
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency: intent.currency,
    env: config.env,
  };
}

export async function confirmAirwallexPaymentForOrder(order: typeof orders.$inferSelect) {
  if (!order.airwallexPaymentIntentId) {
    return { ok: false as const, code: 'PAYMENT_INTENT_MISSING' as const };
  }

  const intent = await withAirwallexAuthRetry(() =>
    retrieveAirwallexPaymentIntent(order.airwallexPaymentIntentId!),
  );

  const chargeCurrency = resolveOrderCurrencyCode(order);

  if (intent.merchant_order_id !== order.orderNumber) {
    return { ok: false as const, code: 'PAYMENT_INTENT_MISMATCH' as const };
  }

  if (!airwallexAmountMatchesOrder(intent.amount, order.totalAmount, chargeCurrency)) {
    return { ok: false as const, code: 'PAYMENT_AMOUNT_MISMATCH' as const };
  }

  const paidIntentStatuses = PAID_INTENT_STATUSES;
  if (!paidIntentStatuses.has(intent.status)) {
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
      paymentMethod: 'Credit Card (Airwallex)',
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
        source: 'airwallex',
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

export async function getAirwallexPaymentStatusForOrder(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const status = await checkOrderPaymentGatewayStatus(order, options);
  return {
    paymentStatus: status.sitePaymentStatus,
    intentStatus: status.gatewayStatus,
    orderStatus: status.orderStatus,
  };
}
