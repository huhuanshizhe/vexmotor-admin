import { NextRequest, NextResponse } from 'next/server';

import { parseCouponListQuery } from '@/lib/coupon-list-query';
import { adminCouponPayloadSchema, createAdminCoupon, listAdminCoupons } from '@/server/admin/coupons';

export async function GET(request: NextRequest) {
  const query = parseCouponListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const result = await listAdminCoupons(query);
  return NextResponse.json({
    items: result.items,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminCouponPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const coupon = await createAdminCoupon(parsed.data);
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建优惠券失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
