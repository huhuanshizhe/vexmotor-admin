import { getAdminCommerceConfig } from '@/server/commerce/config';

import { ShippingMethodsClient } from '@/components/commerce/shipping-methods-client';

export default async function AdminShippingMethodsPage() {
  const initialConfig = await getAdminCommerceConfig();

  return <ShippingMethodsClient initialConfig={initialConfig} />;
}
