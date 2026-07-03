import 'server-only';

import type { orders } from '@/server/db/schema';
import {
  checkOrderPaymentGatewayStatus as checkAirwallexPaymentGatewayStatus,
  confirmAirwallexPaymentForOrder,
  ensureAirwallexPaymentIntentForOrder,
  getAirwallexPaymentStatusForOrder,
} from '@/server/payments/airwallex/checkout-payment';
import { isAirwallexConfigured } from '@/server/payments/airwallex/config';
import {
  checkStripePaymentGatewayStatus,
  confirmStripePaymentForOrder,
  ensureStripePaymentIntentForOrder,
  getStripePaymentStatusForOrder,
} from '@/server/payments/stripe/checkout-payment';
import { isStripeConfigured } from '@/server/payments/stripe/config';

export type CheckoutPaymentGateway = 'stripe' | 'airwallex';

export function resolveOrderPaymentGateway(order: typeof orders.$inferSelect): CheckoutPaymentGateway | null {
  if (order.paymentStatus === 'paid') {
    return null;
  }

  if (order.airwallexPaymentIntentId && !order.stripePaymentIntentId) {
    return 'airwallex';
  }

  if (order.paymentMethod === 'Credit Card' || order.stripePaymentIntentId) {
    return 'stripe';
  }

  return null;
}

function buildPaymentRedirectPath(orderNumber: string, userId?: string | null) {
  return userId ? `/account/orders/${orderNumber}` : `/checkout/confirmation/${orderNumber}`;
}

export async function ensurePaymentIntentForOrder(input: {
  order: typeof orders.$inferSelect;
  customerEmail?: string;
}) {
  const gateway = resolveOrderPaymentGateway(input.order);

  if (gateway === 'airwallex') {
    const result = await ensureAirwallexPaymentIntentForOrder(input);
    if (!result.ok) {
      return result;
    }
    return {
      ...result,
      gateway: 'airwallex' as const,
    };
  }

  if (!isStripeConfigured()) {
    return { ok: false as const, code: 'STRIPE_NOT_CONFIGURED' as const };
  }

  return ensureStripePaymentIntentForOrder(input);
}

export async function confirmPaymentForOrder(order: typeof orders.$inferSelect) {
  const gateway = order.airwallexPaymentIntentId && !order.stripePaymentIntentId
    ? 'airwallex'
    : 'stripe';

  if (gateway === 'airwallex') {
    return confirmAirwallexPaymentForOrder(order);
  }

  return confirmStripePaymentForOrder(order);
}

export async function checkOrderPaymentGatewayStatus(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const gateway = resolveOrderPaymentGateway(order) ?? (
    order.stripePaymentIntentId ? 'stripe' : order.airwallexPaymentIntentId ? 'airwallex' : 'stripe'
  );

  if (gateway === 'airwallex') {
    return checkAirwallexPaymentGatewayStatus(order, options);
  }

  return checkStripePaymentGatewayStatus(order, options);
}

export async function getPaymentStatusForOrder(
  order: typeof orders.$inferSelect,
  options?: { userId?: string | null },
) {
  const gateway = resolveOrderPaymentGateway(order) ?? (
    order.stripePaymentIntentId ? 'stripe' : order.airwallexPaymentIntentId ? 'airwallex' : 'stripe'
  );

  if (gateway === 'airwallex') {
    return getAirwallexPaymentStatusForOrder(order, options);
  }

  return getStripePaymentStatusForOrder(order, options);
}

export function isPaymentGatewayConfigured(order: typeof orders.$inferSelect) {
  const gateway = resolveOrderPaymentGateway(order);
  if (gateway === 'airwallex') {
    return isAirwallexConfigured();
  }
  if (gateway === 'stripe') {
    return isStripeConfigured();
  }
  return isStripeConfigured() || isAirwallexConfigured();
}

export function buildCheckoutPaymentRedirectPath(orderNumber: string, userId?: string | null) {
  return buildPaymentRedirectPath(orderNumber, userId);
}

export type { OrderPaymentGatewayStatus } from '@/server/payments/stripe/checkout-payment';
