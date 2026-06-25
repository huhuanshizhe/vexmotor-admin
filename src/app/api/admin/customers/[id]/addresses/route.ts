import { NextResponse } from 'next/server';

import { getAdminCustomerAddresses } from '@/server/admin/customers';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const addresses = await getAdminCustomerAddresses(id);
  if (!addresses) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(addresses);
}
