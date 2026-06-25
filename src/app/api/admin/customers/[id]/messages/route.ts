import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminUserId } from '@/server/auth/bearer';
import { listCustomerMessages, sendAdminCustomerMessage } from '@/server/admin/customers';

const postSchema = z.object({
  body: z.string().trim().min(1),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await listCustomerMessages(id);
  if (!items) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ items });
}

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
  const created = await sendAdminCustomerMessage(id, adminId, parsed.data.body);
  if (!created) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
