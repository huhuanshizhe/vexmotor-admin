import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getCurrentUserId } from '@/server/auth/session';
import { db } from '@/server/db';
import { products, wishlists } from '@/server/db/schema';
import { getWishlistByUser } from '@/server/storefront/account';

const wishlistSchema = z.object({
  productId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json(await getWishlistByUser(userId));
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid wishlist payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
  }

  await db.insert(wishlists).values({ userId, productId: parsed.data.productId }).onConflictDoNothing();
  return NextResponse.json(await getWishlistByUser(userId), { status: 201 });
}
