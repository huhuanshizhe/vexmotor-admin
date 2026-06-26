import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LOCALE_REQUEST_HEADER, normalizeLocale } from '@/lib/i18n';
import { getCurrentUserId } from '@/server/auth/session';
import { sendOrderConfirmationEmail } from '@/server/email';
import { createOrderFromCart, getOrCreateCart } from '@/server/storefront/cart';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

const addressSnapshotSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).nullable().optional().transform((value) => value ?? null),
  phone: z.string().trim().max(60).nullable().optional().transform((value) => value ?? null),
  countryCode: z.string().trim().min(2).max(2),
  state: z.string().trim().max(80).nullable().optional().transform((value) => value ?? null),
  city: z.string().trim().min(1).max(120),
  addressLine1: z.string().trim().min(1).max(160),
  addressLine2: z.string().trim().max(160).nullable().optional().transform((value) => value ?? null),
  postalCode: z.string().trim().min(1).max(32),
});

const orderSchema = z.object({
  shippingAddressId: z.string().uuid().optional(),
  billingAddressId: z.string().uuid().optional(),
  shippingAddress: addressSnapshotSchema.optional(),
  billingAddress: addressSnapshotSchema.optional(),
  shippingMethod: z.string().min(1),
  paymentMethod: z.string().min(1),
  customerNote: z.string().optional(),
  purchaseOrderNumber: z.string().max(80).optional(),
  taxId: z.string().max(80).optional(),
  requestedShipDate: z.string().max(40).optional(),
  tradeTerm: z.string().max(40).optional(),
  contactEmail: z.string().trim().email().max(160).optional(),
  subscribeToUpdates: z.boolean().optional(),
  exportComplianceConfirmed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid checkout payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cartToken = request.headers.get('x-cart-token')?.trim() || cookieStore.get('cart_token')?.value || null;
  const cart = await getOrCreateCart({ userId, anonymousToken: cartToken });
  if (!cart) {
    return NextResponse.json({ code: 'CART_UNAVAILABLE', message: 'Cart not found' }, { status: 400 });
  }

  if (!parsed.data.exportComplianceConfirmed) {
    return NextResponse.json({ code: 'EXPORT_COMPLIANCE_REQUIRED', message: 'Confirm restricted end-use compliance before placing the order.' }, { status: 400 });
  }

  if (!userId && !parsed.data.contactEmail?.trim()) {
    return NextResponse.json({ code: 'CONTACT_EMAIL_REQUIRED', message: 'Guest checkout requires a contact email.' }, { status: 400 });
  }

  const customerNote = [
    parsed.data.contactEmail ? `Contact Email: ${parsed.data.contactEmail}` : null,
    parsed.data.purchaseOrderNumber ? `PO Number: ${parsed.data.purchaseOrderNumber}` : null,
    parsed.data.taxId ? `Tax ID / VAT: ${parsed.data.taxId}` : null,
    parsed.data.requestedShipDate ? `Requested Ship Date: ${parsed.data.requestedShipDate}` : null,
    parsed.data.tradeTerm ? `Trade Term: ${parsed.data.tradeTerm}` : null,
    parsed.data.subscribeToUpdates ? 'Engineering Updates: Yes' : null,
    parsed.data.exportComplianceConfirmed ? 'Restricted End Use Confirmed: Yes' : null,
    parsed.data.customerNote?.trim() || null,
  ]
    .filter(Boolean)
    .join('\n');

  const locale = normalizeLocale(request.headers.get(LOCALE_REQUEST_HEADER));

  const order = userId
    ? await createOrderFromCart({
        userId,
        cartId: cart.id,
        shippingAddressId: parsed.data.shippingAddressId,
        billingAddressId: parsed.data.billingAddressId,
        shippingMethod: parsed.data.shippingMethod,
        paymentMethod: parsed.data.paymentMethod,
        customerNote,
        locale,
      })
    : await createOrderFromCart({
        userId: null,
        cartId: cart.id,
        shippingAddress: parsed.data.shippingAddress,
        billingAddress: parsed.data.billingAddress,
        shippingMethod: parsed.data.shippingMethod,
        paymentMethod: parsed.data.paymentMethod,
        customerNote,
        locale,
      });

  if (!order) {
    return NextResponse.json({ code: 'ORDER_CREATE_FAILED', message: 'Unable to create order' }, { status: 400 });
  }

  const redirectPath = userId ? `/account/orders/${order.orderNumber}` : `/checkout/confirmation/${order.orderNumber}`;
  const guestAccessTokenCandidate = !userId ? (order as unknown as { guestAccessToken?: string }).guestAccessToken : undefined;
  const guestAccessToken = typeof guestAccessTokenCandidate === 'string' ? guestAccessTokenCandidate : undefined;
  const response = NextResponse.json(
    { orderNumber: order.orderNumber, redirectPath, guestAccessToken },
    { status: 201, headers: corsHeaders() },
  );

  if (guestAccessToken) {
    response.cookies.set('guest_order_access_token', guestAccessToken, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  // Fire order confirmation email (non-blocking)
  const recipientEmail = parsed.data.contactEmail ?? (userId ? null : null);
  if (recipientEmail) {
    sendOrderConfirmationEmail({
      to: recipientEmail,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount ?? 0),
      currency: (order as any).currencyCode ?? 'USD',
    }).catch((err) => console.error('[checkout] Order email error:', err));
  }

  return response;
}
