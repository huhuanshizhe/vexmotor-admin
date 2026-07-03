import { GlobalSettingsClient } from '@/components/site/global-settings-client';
import { buildPaymentDiagnostics } from '@/server/payments/payment-diagnostics';
import { getSiteSettings } from '@/server/site/settings';

export default async function AdminSiteConfigPage() {
  const [settings, paymentDiagnostics] = await Promise.all([
    getSiteSettings(),
    buildPaymentDiagnostics(),
  ]);

  return (
    <GlobalSettingsClient
      initialSettings={{
        ...settings,
        paymentDiagnostics,
      }}
    />
  );
}
