import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import {
  getGuestInquiryAccessCookieName,
  getStorefrontInquiryDetailByIdOrQuoteNumber,
  postStorefrontInquiryMessage,
} from '@/server/storefront/inquiries';

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid message payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const userId = await getCurrentUserId(request);
  const cookieStore = await cookies();

  const detail = await getStorefrontInquiryDetailByIdOrQuoteNumber({
    idOrQuoteNumber: id,
    userId,
    guestAccessToken: userId ? null : cookieStore.get(getGuestInquiryAccessCookieName(id))?.value ?? null,
  });

  if (!detail) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Inquiry not found or access denied' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  const guestAccessToken = userId
    ? null
    : cookieStore.get(getGuestInquiryAccessCookieName(detail.id))?.value
      ?? cookieStore.get(getGuestInquiryAccessCookieName(id))?.value
      ?? null;

  const updated = await postStorefrontInquiryMessage({
    inquiryId: detail.id,
    userId,
    guestAccessToken,
    body: parsed.data.body,
  });

  if (!updated) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Inquiry not found or access denied' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(updated, { headers: frontCorsHeaders() });
}
