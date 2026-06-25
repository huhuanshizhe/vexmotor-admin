import { NextRequest, NextResponse } from 'next/server';

import { parseInquiryActiveListQuery } from '@/lib/inquiry-list-query';
import { listActiveAdminInquiries } from '@/server/admin/inquiries';

export async function GET(request: NextRequest) {
  const query = parseInquiryActiveListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const items = await listActiveAdminInquiries(query);
  return NextResponse.json({ items });
}
