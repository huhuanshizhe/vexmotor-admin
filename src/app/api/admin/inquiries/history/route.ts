import { NextRequest, NextResponse } from 'next/server';

import { parseInquiryHistoryListQuery } from '@/lib/inquiry-list-query';
import { listHistoryAdminInquiries } from '@/server/admin/inquiries';

export async function GET(request: NextRequest) {
  const query = parseInquiryHistoryListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const result = await listHistoryAdminInquiries(query);
  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}
