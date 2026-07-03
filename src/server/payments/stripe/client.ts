import 'server-only';

import Stripe from 'stripe';

import { getStripeConfig } from '@/server/payments/stripe/config';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const config = getStripeConfig();
  if (!config) {
    throw new Error('Stripe is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey);
  }

  return stripeClient;
}

export async function createStripePaymentIntent(input: {
  amount: number;
  currency: string;
  orderNumber: string;
  customerEmail?: string;
}) {
  const stripe = getStripeClient();

  return stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    metadata: {
      orderNumber: input.orderNumber,
    },
    receipt_email: input.customerEmail || undefined,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

export async function retrieveStripePaymentIntent(intentId: string) {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(intentId);
}

export async function cancelStripePaymentIntent(intentId: string) {
  const stripe = getStripeClient();
  return stripe.paymentIntents.cancel(intentId);
}
