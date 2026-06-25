import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_LIST_DEFAULT_PAGE_SIZE, normalizePageSize } from '@/lib/admin-list-query';
import { couponGrantSources } from '@/lib/coupon-list-query';
import { listCouponGrants } from '@/server/admin/coupons';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(searchParams.get('page_size') ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);
  const sourceRaw = searchParams.get('source')?.trim() ?? '';
  const source = couponGrantSources.includes(sourceRaw as typeof couponGrantSources[number])
    ? sourceRaw as typeof couponGrantSources[number]
    : '';
  const batchId = searchParams.get('batch_id')?.trim() ?? '';

  const result = await listCouponGrants(id, { page, pageSize, source, batchId });
  return NextResponse.json({
    items: result.items,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
}
