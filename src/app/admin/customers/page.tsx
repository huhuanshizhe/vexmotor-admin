import { getAdminCustomers } from '@/server/admin/customers';

import { AdminCustomersClient } from './customers-client';

export default async function AdminCustomersPage() {
  const rows = await getAdminCustomers();

  return <AdminCustomersClient initialRows={rows} />;
}
