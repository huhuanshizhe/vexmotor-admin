import type { PropsWithChildren } from 'react';

import { AdminShell } from '@/components/layout/admin-shell';
import { getServerSitePreferences } from '@/lib/i18n-server';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata() {
  const { locale } = await getServerSitePreferences();
  return buildMetadata({
  title: '管理后台 — VexMotor',
  description: '内部运营管理控制台。',
  path: '/admin',
  noIndex: true,
    locale,
  });
}

export default function AdminLayout({ children }: PropsWithChildren) {
  return <AdminShell>{children}</AdminShell>;
}
