import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import {
  getGuestInquiryAccessCookieName,
  getStorefrontInquiryDetailByIdOrQuoteNumber,
} from '@/server/storefront/inquiries';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUserId(request);
  const cookieStore = await cookies();

  let guestAccessToken: string | null = null;
  if (!userId) {
    guestAccessToken = cookieStore.get(getGuestInquiryAccessCookieName(id))?.value ?? null;
    if (!guestAccessToken) {
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith('guest_inquiry_access_')) {
          guestAccessToken = cookie.value;
          break;
        }
      }
    }
  }

  const detail = await getStorefrontInquiryDetailByIdOrQuoteNumber({
    idOrQuoteNumber: id,
    userId,
    guestAccessToken,
  });

  if (!detail) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Inquiry not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(detail, { headers: frontCorsHeaders() });
}
