import { getAdminProductOptions, getAdminProducts } from '@/server/admin/products';

import { AdminProductsClient } from './products-client';

export default async function AdminProductsPage() {
  const [{ items }, options] = await Promise.all([getAdminProducts(), getAdminProductOptions()]);

  return <AdminProductsClient initialRows={items} brandOptions={options.brands} categoryOptions={options.categories} />;
}
