import { getAdminSiteLanguages, getAvailableCommonLanguages } from '@/server/admin/languages';

import { AdminLanguagesClient } from './languages-client';

export default async function AdminLanguagesPage() {
  const [rows, availableLanguages] = await Promise.all([getAdminSiteLanguages(), getAvailableCommonLanguages()]);

  return <AdminLanguagesClient initialRows={rows} initialAvailableLanguages={availableLanguages} />;
}
