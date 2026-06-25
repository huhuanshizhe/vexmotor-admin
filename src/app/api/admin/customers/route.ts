import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { parseCustomerListQuery } from '@/lib/customer-list-query';
import { createAdminCustomer, listAdminCustomers } from '@/server/admin/customers';

const customerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().nullable().optional().transform((value) => value ?? null),
  phone: z.string().nullable().optional().transform((value) => value ?? null),
  role: z.enum(['customer', 'staff', 'admin']).default('customer'),
  password: z.string().min(8),
});

export async function GET(request: NextRequest) {
  const query = parseCustomerListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const result = await listAdminCustomers(query);

  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
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
