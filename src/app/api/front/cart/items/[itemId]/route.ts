import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteCartItem, updateCartItemQuantity } from '@/server/storefront/cart';

const patchSchema = z.object({
  quantity: z.coerce.number().int().min(1),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid cart payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const detail = await updateCartItemQuantity(itemId, parsed.data.quantity);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Cart item not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const detail = await deleteCartItem(itemId);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Cart item not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
