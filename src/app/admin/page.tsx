import { getAdminOverview } from '@/server/admin/overview';

import { AdminOverviewClient } from './overview-client';

export default async function AdminPage() {
  const overview = await getAdminOverview();

  return <AdminOverviewClient {...overview} />;
}
