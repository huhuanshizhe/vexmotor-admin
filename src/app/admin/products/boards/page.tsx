import { AdminProductBoardsClient } from './product-boards-client';

import { getAdminProductBoardsDashboard } from '@/server/admin/product-boards';

export default async function AdminProductBoardsPage() {
  const dashboard = await getAdminProductBoardsDashboard();
  return <AdminProductBoardsClient initialDashboard={dashboard} />;
}
