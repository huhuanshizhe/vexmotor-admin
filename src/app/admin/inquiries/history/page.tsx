import { listHistoryAdminInquiries } from '@/server/admin/inquiries';

import { parseInquiryHistoryListQuery } from '@/lib/inquiry-list-query';

import { InquiryHistoryListClient } from '@/components/inquiries/inquiry-history-list-client';

export default async function AdminInquiryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseInquiryHistoryListQuery(params);
  const result = await listHistoryAdminInquiries(query);

  return (
    <InquiryHistoryListClient
      initialList={{
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }}
      initialQuery={query}
    />
  );
}
