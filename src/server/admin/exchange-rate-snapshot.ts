import 'server-only';

import { buildSnapshotFromConfig } from '@/lib/currency-exchange';
import { getAdminExchangeRateConfig } from '@/server/admin/exchange-rates';

export async function getExchangeRateSnapshot() {
  const config = await getAdminExchangeRateConfig();
  return buildSnapshotFromConfig(config);
}
