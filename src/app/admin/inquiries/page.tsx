import { listActiveAdminInquiries } from '@/server/admin/inquiries';

import { parseInquiryActiveListQuery } from '@/lib/inquiry-list-query';

import { InquiryActiveListClient } from '@/components/inquiries/inquiry-active-list-client';

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseInquiryActiveListQuery(params);
  const items = await listActiveAdminInquiries(query);

  return <InquiryActiveListClient initialItems={items} initialQuery={query} />;
}
