import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { createAddressForUser, getAddressesByUser } from '@/server/storefront/account';

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  countryCode: z.string().length(2),
  state: z.string().optional().nullable(),
  city: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  return NextResponse.json(await getAddressesByUser(userId), { headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid address payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const created = await createAddressForUser(userId, parsed.data);
  return NextResponse.json(created, { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
