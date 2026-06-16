import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUserId } from '@/server/auth/session';
import { deleteAddressForUser, updateAddressForUser } from '@/server/storefront/account';

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  countryCode: z.string().length(2).optional(),
  state: z.string().nullable().optional(),
  city: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid address payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateAddressForUser(userId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Address not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteAddressForUser(userId, id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Address not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
