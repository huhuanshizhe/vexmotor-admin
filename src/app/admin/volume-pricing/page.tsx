import { getAdminCommerceConfig } from '@/server/commerce/config';

import { VolumePricingClient } from '@/components/commerce/volume-pricing-client';

export default async function AdminVolumePricingPage() {
  const initialConfig = await getAdminCommerceConfig();

  return <VolumePricingClient initialConfig={initialConfig} />;
}
