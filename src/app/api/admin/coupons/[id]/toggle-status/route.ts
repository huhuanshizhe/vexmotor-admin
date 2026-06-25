import { NextResponse } from 'next/server';

import { toggleAdminCouponStatus } from '@/server/admin/coupons';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await toggleAdminCouponStatus(id);
  if (!coupon) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json(coupon);
}
