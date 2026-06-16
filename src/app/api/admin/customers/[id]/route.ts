import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminCustomer, updateAdminCustomer } from '@/server/admin/customers';

const patchSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  company: z.string().nullable().optional().transform((value) => value ?? null),
  phone: z.string().nullable().optional().transform((value) => value ?? null),
  avatarUrl: z.string().nullable().optional().transform((value) => value ?? null),
  role: z.enum(['customer', 'staff', 'admin']).optional(),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminCustomer(id);
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
  const updated = await updateAdminCustomer(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
