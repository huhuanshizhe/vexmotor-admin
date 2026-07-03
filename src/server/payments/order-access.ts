import 'server-only';

import { and, eq, gt } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { db } from '@/server/db';
import { orders, verificationTokens } from '@/server/db/schema';

function getOrderTokenIdentifier(orderNumber: string) {
  return `guest-order:${orderNumber}`;
}

export async function resolveGuestOrderAccessToken(request: NextRequest) {
  return (
    request.headers.get('x-guest-order-token')?.trim()
    || request.nextUrl.searchParams.get('guestToken')?.trim()
    || request.cookies.get('guest_order_access_token')?.value?.trim()
    || null
  );
}

export async function assertCheckoutOrderAccess(request: NextRequest, orderNumber: string) {
  const userId = await getCurrentUserId(request);
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    return { ok: false as const, code: 'ORDER_NOT_FOUND' as const, status: 404 as const };
  }

  if (userId) {
    if (order.userId !== userId) {
      return { ok: false as const, code: 'FORBIDDEN' as const, status: 403 as const };
    }
    return { ok: true as const, order, userId };
  }

  if (order.userId) {
    return { ok: false as const, code: 'UNAUTHORIZED' as const, status: 401 as const };
  }

  const guestToken = await resolveGuestOrderAccessToken(request);
  if (!guestToken) {
    return { ok: false as const, code: 'UNAUTHORIZED' as const, status: 401 as const };
  }

  const [tokenRecord] = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, getOrderTokenIdentifier(orderNumber)),
        eq(verificationTokens.token, guestToken),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  if (!tokenRecord) {
    return { ok: false as const, code: 'FORBIDDEN' as const, status: 403 as const };
  }

  return { ok: true as const, order, userId: null, guestToken };
}
