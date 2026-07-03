import { SiteSettingsClient } from '@/components/site/site-settings-client';
import { getSiteSettings } from '@/server/site/settings';

export default async function AdminSiteConfigPage() {
  const initialSettings = await getSiteSettings();

  return <SiteSettingsClient initialSettings={initialSettings} />;
}
