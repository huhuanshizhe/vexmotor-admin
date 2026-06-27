import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteAdminCustomer, getAdminCustomerDetail, patchAdminCustomer } from '@/server/admin/customers';
import { assertAdminDebugDeleteAllowed } from '@/server/auth/debug-mode';
import { requireAdminUserId } from '@/server/auth/bearer';

const patchSchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  internalNote: z.string().nullable().optional().transform((value) => value ?? null),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminCustomerDetail(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await patchAdminCustomer(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found or cannot be updated' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await assertAdminDebugDeleteAllowed(request, adminId);
  if (!allowed.ok) {
    return NextResponse.json({ code: 'FORBIDDEN', message: allowed.message }, { status: allowed.status });
  }

  const { id } = await params;
  const deleted = await deleteAdminCustomer(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
