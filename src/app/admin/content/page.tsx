import { getAdminCmsPages, getAdminContentBlocks } from '@/server/admin/content';

import { AdminContentClient } from './content-client';

export default async function AdminContentPage() {
  const [blocks, pages] = await Promise.all([getAdminContentBlocks(), getAdminCmsPages()]);

  return <AdminContentClient initialBlocks={blocks} initialPages={pages} />;
}
