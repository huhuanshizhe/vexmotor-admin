import { AdminUiStringsClient } from './ui-strings-client';
import { getUiStringsManifestUrl } from '@/server/admin/ui-strings';

export default function AdminUiStringsPage() {
  const manifestUrl = getUiStringsManifestUrl();
  return <AdminUiStringsClient manifestUrl={manifestUrl} />;
}
