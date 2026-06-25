import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { couponDistributionTargetModes } from '@/lib/coupon-list-query';
import { sendCouponToCustomers } from '@/server/admin/coupons';
import { getAdminUserId } from '@/server/auth/bearer';

const sendSchema = z.object({
  targetMode: z.enum(couponDistributionTargetModes),
  userIds: z.array(z.string().uuid()).optional(),
  quantityPerUser: z.coerce.number().int().min(1).default(1),
  note: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.targetMode === 'selected_customers' && !(value.userIds?.length)) {
    ctx.addIssue({ code: 'custom', message: '请选择至少一位客户', path: ['userIds'] });
  }
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await sendCouponToCustomers(id, adminId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '发放失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
