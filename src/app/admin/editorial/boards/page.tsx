import { AdminEditorialBoardsClient } from './boards-client';

import { getAdminEditorialContentList } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';

export default async function AdminEditorialBoardsPage() {
  const [dashboard, entries] = await Promise.all([
    getAdminEditorialDashboard(),
    getAdminEditorialContentList(),
  ]);

  return <AdminEditorialBoardsClient initialDashboard={dashboard} initialEntries={entries} />;
}
