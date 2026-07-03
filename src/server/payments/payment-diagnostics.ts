import 'server-only';

import type { PaymentDiagnostics } from '@/lib/site-settings';
import { buildAirwallexPaymentDiagnostics } from '@/server/payments/airwallex/config';
import { buildStripePaymentDiagnostics } from '@/server/payments/stripe/config';
import { resolvePaymentActiveModeLabel } from '@/server/payments/payment-mode';

export async function buildPaymentDiagnostics(): Promise<PaymentDiagnostics> {
  const activeMode = await resolvePaymentActiveModeLabel();
  const [stripe, airwallex] = await Promise.all([
    buildStripePaymentDiagnostics(),
    buildAirwallexPaymentDiagnostics(),
  ]);

  return { activeMode, stripe, airwallex };
}
