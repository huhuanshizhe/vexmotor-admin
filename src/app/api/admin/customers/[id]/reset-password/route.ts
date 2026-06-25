import { NextResponse } from 'next/server';

import { resetAdminCustomerPassword } from '@/server/admin/customers';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await resetAdminCustomerPassword(id);
  if (!result) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
