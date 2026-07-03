import 'server-only';

import Stripe from 'stripe';

import { getStripeConfig } from '@/server/payments/stripe/config';

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export async function getStripeClient() {
  const config = await getStripeConfig();
  if (!config) {
    throw new Error('Stripe is not configured');
  }

  if (!stripeClient || stripeClientKey !== config.secretKey) {
    stripeClient = new Stripe(config.secretKey);
    stripeClientKey = config.secretKey;
  }

  return stripeClient;
}

export async function createStripePaymentIntent(input: {
  amount: number;
  currency: string;
  orderNumber: string;
  customerEmail?: string;
}) {
  const stripe = await getStripeClient();

  return stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    payment_method_types: ['card'],
    metadata: {
      orderNumber: input.orderNumber,
    },
    receipt_email: input.customerEmail || undefined,
  });
}

export async function retrieveStripePaymentIntent(intentId: string) {
  const stripe = await getStripeClient();
  return stripe.paymentIntents.retrieve(intentId);
}

export async function cancelStripePaymentIntent(intentId: string) {
  const stripe = await getStripeClient();
  return stripe.paymentIntents.cancel(intentId);
}
