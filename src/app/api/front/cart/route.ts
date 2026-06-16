import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUserId } from '@/server/auth/session';
import { addCartItem, getCartDetail, getOrCreateCart, updateCartCoupon } from '@/server/storefront/cart';

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  variantId: z.string().optional().nullable(),
});

const couponSchema = z.object({
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
});

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

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

function buildCartResponse(detail: Awaited<ReturnType<typeof getCartDetail>>, anonymousToken: string | null, cartUserId: string | null | undefined) {
  const response = NextResponse.json({
    ...detail,
    cartToken: !cartUserId && anonymousToken ? anonymousToken : undefined,
  }, { headers: corsHeaders() });

  if (anonymousToken && !cartUserId) {
    response.cookies.set('cart_token', anonymousToken, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: corsHeaders() });
  }

  const detail = await getCartDetail(cart.id);
  return buildCartResponse(detail, anonymousToken, cart.userId);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid cart payload', details: parsed.error.flatten() }, { status: 400, headers: corsHeaders() });
  }

  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: corsHeaders() });
  }

  const detail = await addCartItem({
    cartId: cart.id,
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
  });

  if (!detail) {
    return NextResponse.json({ code: 'PRODUCT_NOT_AVAILABLE', message: 'Product cannot be added to cart' }, { status: 400, headers: corsHeaders() });
  }

  return buildCartResponse(detail, anonymousToken, cart.userId);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid coupon payload', details: parsed.error.flatten() }, { status: 400, headers: corsHeaders() });
  }

  const { cart, anonymousToken } = await getCartContext(request);
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart could not be initialized' }, { status: 500, headers: corsHeaders() });
  }

  const result = await updateCartCoupon(cart.id, parsed.data.couponCode ?? null);
  if (!result.detail) {
    return NextResponse.json({ code: result.error ?? 'COUPON_UPDATE_FAILED', message: result.message ?? 'Coupon update failed' }, { status: 400, headers: corsHeaders() });
  }

  return buildCartResponse(result.detail, anonymousToken, cart.userId);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
