import { AdminEditorialClient } from './editorial-client';

import { getAdminEditorialContentList } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';
import { getAdminSiteLanguages } from '@/server/admin/languages';

export default async function AdminEditorialPage() {
  const [dashboard, contentEntries, siteLanguages] = await Promise.all([
    getAdminEditorialDashboard(),
    getAdminEditorialContentList(),
    getAdminSiteLanguages(),
  ]);

  const activeLanguages = siteLanguages.filter((language) => language.status === 'active');

  return (
    <AdminEditorialClient
      initialDashboard={dashboard}
      initialEntries={contentEntries}
      activeLanguages={activeLanguages}
    />
  );
}
