import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { db } from '@/server/db';
import { wishlists } from '@/server/db/schema';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const { productId } = await params;
  await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
  return new NextResponse(null, { status: 204 });
}
