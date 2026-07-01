import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { cancelOrderForUser } from '@/server/storefront/orders';

import { frontCorsHeaders } from '@/lib/front-cors';

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const { orderNumber } = await params;
  const result = await cancelOrderForUser(userId, orderNumber);

  if (!result.ok) {
    const status =
      result.code === 'NOT_FOUND'
        ? 404
        : result.code === 'CANNOT_CANCEL'
          ? 409
          : 400;

    return NextResponse.json(
      { code: result.code, message: 'Unable to cancel order' },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
