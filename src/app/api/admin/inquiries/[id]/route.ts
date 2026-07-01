import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminInquiryDetail, updateAdminInquiry } from '@/server/admin/inquiries';

const quotedLineSchema = z.object({
  productId: z.string().uuid(),
  spu: z.string(),
  name: z.string(),
  slug: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  currency: z.string().min(3).max(3),
  leadTime: z.string(),
  note: z.string(),
});

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'closed']).optional(),
  salesStatus: z.enum(['unset', 'following', 'negotiating', 'won', 'lost']).optional(),
  internalNote: z.string().nullable().optional().transform((value) => value ?? null),
  quotedLines: z.array(quotedLineSchema).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional().transform((value) => (value ? new Date(value) : null)),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getAdminInquiryDetail(id);
  if (!inquiry) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Inquiry not found' }, { status: 404 });
  }

  return NextResponse.json(inquiry);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateAdminInquiry({
    id,
    status: parsed.data.status,
    salesStatus: parsed.data.salesStatus,
    internalNote: parsed.data.internalNote,
    quotedLines: parsed.data.quotedLines,
    expiresAt: parsed.data.expiresAt,
  });

  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Inquiry not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
