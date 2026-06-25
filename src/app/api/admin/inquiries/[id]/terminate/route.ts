import { NextResponse } from 'next/server';

import { getAdminUserId } from '@/server/auth/bearer';
import { terminateAdminInquiry } from '@/server/admin/inquiries';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const { id } = await params;
  const updated = await terminateAdminInquiry(id, adminId);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Inquiry not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
