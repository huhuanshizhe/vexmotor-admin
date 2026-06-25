import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { reviewAdminCustomer } from '@/server/admin/customers';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await reviewAdminCustomer(id, parsed.data.action);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found or not pending review' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
