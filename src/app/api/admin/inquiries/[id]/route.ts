import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession, getCurrentUserId } from '@/server/auth/session';
import { getAdminInquiryDetail, updateAdminInquiry } from '@/server/admin/inquiries';

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'closed']).optional(),
  internalNote: z.string().nullable().optional().transform((value) => value ?? null),
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
  const currentUserId = await getCurrentUserId();
  const session = await getAuthSession();
  const updated = await updateAdminInquiry({
    id,
    status: parsed.data.status,
    internalNote: parsed.data.internalNote,
    handledBy: currentUserId,
    handledByEmail: session?.user?.email ?? null,
  });

  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Inquiry not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
