import { getAdminBrands } from '@/server/admin/brands';

import { AdminBrandsClient } from './brands-client';

export default async function AdminBrandsPage() {
  const rows = await getAdminBrands();

  return <AdminBrandsClient initialRows={rows} />;
}
