import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { addCartItem, getCartDetail, getOrCreateCart, updateCartCoupon } from '@/server/storefront/cart';

const addSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  featureSelections: z.array(z.object({ valueId: z.string().uuid() })).optional().default([]),
});

const couponSchema = z.object({
  couponCode: z.string().trim().max(64).optional().nullable(),
});

async function getCartContext(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  let anonymousToken = request.headers.get('x-cart-token')?.trim() || null;

  if (!anonymousToken) {
    const cookieStore = await cookies();
    anonymousToken = cookieStore.get('cart_token')?.value ?? null;
  }

  if (!userId && !anonymousToken) {
    anonymousToken = randomUUID();
  }

  const cart = await getOrCreateCart({ userId, anonymousToken });
  return { cart, anonymousToken };
}

function buildCartResponse(
  detail: Awaited<ReturnType<typeof getCartDetail>>,
  anonymousToken: string | null,
  cartUserId: string | null | undefined,
) {
  const response = NextResponse.json(
    {
      ...detail,
      cartToken: !cartUserId && anonymousToken ? anonymousToken : undefined,
    },
    { headers: frontCorsHeaders() },
  );

  if (anonymousToken && !cartUserId) {
    response.cookies.set('cart_token', anonymousToken, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: frontCorsHeaders() });
  }

  const detail = await getCartDetail(cart.id, locale);
  return buildCartResponse(detail, anonymousToken, cart.userId);
}

export async function POST(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid cart payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: frontCorsHeaders() });
  }

  const result = await addCartItem({
    cartId: cart.id,
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
    locale,
    featureValueIds: parsed.data.featureSelections.map((item) => item.valueId),
  });

  if (!result.ok) {
    const status = result.code === 'INVALID_FEATURE_SELECTIONS' ? 400 : 400;
    return NextResponse.json({ code: result.code, message: result.message }, { status, headers: frontCorsHeaders() });
  }

  return buildCartResponse(result.detail, anonymousToken, cart.userId);
}

export async function PATCH(request: NextRequest) {
  const locale = resolveFrontRequestLocale(request);
  const body = await request.json();
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid coupon payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: frontCorsHeaders() });
  }

  const result = await updateCartCoupon(cart.id, parsed.data.couponCode ?? null, locale);
  if (!result.detail) {
    return NextResponse.json(
      { code: result.error ?? 'COUPON_UPDATE_FAILED', message: result.message ?? 'Coupon update failed' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  return buildCartResponse(result.detail, anonymousToken, cart.userId);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
