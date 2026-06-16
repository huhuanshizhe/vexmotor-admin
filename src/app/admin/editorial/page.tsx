import { AdminEditorialClient } from './editorial-client';

import { getAdminEditorialBlogEntries, getAdminEditorialPressEntries } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';

export default async function AdminEditorialPage() {
  const dashboardPromise = getAdminEditorialDashboard();
  const blogEntriesPromise = getAdminEditorialBlogEntries();
  const pressEntriesPromise = getAdminEditorialPressEntries();

  const dashboard = await dashboardPromise;
  const blogEntries = await blogEntriesPromise;
  const pressEntries = await pressEntriesPromise;

  return <AdminEditorialClient initialDashboard={dashboard} initialBlogEntries={blogEntries} initialPressEntries={pressEntries} />;
}