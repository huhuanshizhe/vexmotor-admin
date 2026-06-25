import { NextRequest, NextResponse } from 'next/server';

import { adminCouponPayloadSchema, deleteAdminCoupon, getAdminCouponDetail, updateAdminCoupon } from '@/server/admin/coupons';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getAdminCouponDetail(id);
  if (!coupon) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json(coupon);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = adminCouponPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const coupon = await updateAdminCoupon(id, parsed.data);
    if (!coupon) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(coupon);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新优惠券失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminCoupon(id);
  if (!deleted) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
