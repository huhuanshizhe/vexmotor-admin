import 'server-only';

import { getSiteSettings } from '@/server/site/settings';

export type PaymentMode = 'test' | 'live';

export async function resolvePaymentSandboxMode() {
  const settings = await getSiteSettings();
  return settings.paymentSandboxMode;
}

export async function resolvePaymentMode(): Promise<PaymentMode> {
  const sandbox = await resolvePaymentSandboxMode();
  return sandbox ? 'test' : 'live';
}

export async function resolvePaymentActiveModeLabel(): Promise<'sandbox' | 'live'> {
  const sandbox = await resolvePaymentSandboxMode();
  return sandbox ? 'sandbox' : 'live';
}
