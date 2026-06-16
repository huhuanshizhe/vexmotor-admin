import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUserId } from '@/server/auth/session';
import { createStorefrontInquiry, getGuestInquiryAccessCookieName, getStorefrontInquiriesByUser } from '@/server/storefront/inquiries';

const inquirySchema = z.object({
  productId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid inquiry payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId(request);

  const created = await createStorefrontInquiry({
    productId: parsed.data.productId,
    userId,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    company: parsed.data.company ?? null,
    country: parsed.data.country ?? null,
    message: parsed.data.message,
    sourcePageUrl: request.headers.get('referer') ?? null,
  });

  if (!created) {
    return NextResponse.json({ code: 'INQUIRY_CREATE_FAILED', message: 'Unable to submit your inquiry right now.' }, { status: 400 });
  }

  const redirectPath = `/inquiries/${created.id}`;
  const response = NextResponse.json(
    {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      redirectPath,
    },
    { status: 201 },
  );

  if (!userId && created.guestAccessToken) {
    response.cookies.set(getGuestInquiryAccessCookieName(created.id), created.guestAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: redirectPath,
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json(await getStorefrontInquiriesByUser(userId));
}
