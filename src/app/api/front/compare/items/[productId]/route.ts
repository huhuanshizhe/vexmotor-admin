import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { removeCompareItemForUser } from '@/server/storefront/compare';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const { productId } = await params;
  const deleted = await removeCompareItemForUser(userId, productId);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Compare item not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
