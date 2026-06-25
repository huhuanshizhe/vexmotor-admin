import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_LIST_DEFAULT_PAGE_SIZE, normalizePageSize } from '@/lib/admin-list-query';
import { listCouponDistributionBatches } from '@/server/admin/coupons';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(request.nextUrl.searchParams.get('page_size') ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);
  const result = await listCouponDistributionBatches(id, { page, pageSize });
  return NextResponse.json({
    items: result.items,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
}
