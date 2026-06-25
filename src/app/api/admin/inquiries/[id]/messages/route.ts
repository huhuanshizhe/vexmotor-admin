import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminUserId } from '@/server/auth/bearer';
import { replyAdminInquiry } from '@/server/admin/inquiries';

const postSchema = z.object({
  body: z.string().trim().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await replyAdminInquiry(id, adminId, parsed.data.body);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Inquiry not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
