import { getAdminCategories } from '@/server/admin/categories';

import { AdminCategoriesClient } from './categories-client';

export default async function AdminCategoriesPage() {
  const rows = await getAdminCategories();

  return <AdminCategoriesClient initialRows={rows} />;
}
