import { getAdminExchangeRateConfig } from '@/server/admin/exchange-rates';

import { ExchangeRatesClient } from '@/components/exchange-rates/exchange-rates-client';

export default async function AdminExchangeRatesPage() {
  const initialConfig = await getAdminExchangeRateConfig();

  return <ExchangeRatesClient initialConfig={initialConfig} />;
}
