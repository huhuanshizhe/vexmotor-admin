import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminCustomer, getAdminCustomers } from '@/server/admin/customers';

const customerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().nullable().optional().transform((value) => value ?? null),
  phone: z.string().nullable().optional().transform((value) => value ?? null),
  avatarUrl: z.string().nullable().optional().transform((value) => value ?? null),
  role: z.enum(['customer', 'staff', 'admin']).default('customer'),
  status: z.enum(['active', 'disabled', 'pending']).default('pending'),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const items = await getAdminCustomers();
  const filtered = search
    ? items.filter((item) => [item.email, item.firstName, item.lastName, item.company ?? '', item.phone ?? ''].join(' ').toLowerCase().includes(search))
    : items;

  return NextResponse.json({ items: filtered, meta: { total: filtered.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createAdminCustomer(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create customer' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
