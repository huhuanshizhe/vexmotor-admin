import { getAdminCommerceConfig } from '@/server/commerce/config';

import { AdminCommerceClient } from './commerce-client';

export default async function AdminCommercePage() {
  const initialConfig = await getAdminCommerceConfig();

  return <AdminCommerceClient initialConfig={initialConfig} />;
}