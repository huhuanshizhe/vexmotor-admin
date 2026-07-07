import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import {
  confirmEmailVerification,
  createEmailVerificationRequest,
  verifyEmailVerificationToken,
} from '@/server/auth/email-verification';
import { getCurrentUserId } from '@/server/auth/session';

const verifyEmailRequestSchema = z.object({
  action: z.literal('request'),
});

const verifyEmailConfirmSchema = z.object({
  action: z.literal('confirm'),
  token: z.string().min(1),
});

const verifyEmailSchema = z.union([verifyEmailRequestSchema, verifyEmailConfirmSchema]);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return NextResponse.json(
      { valid: false, code: 'VALIDATION_ERROR', message: 'Token is required.' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await verifyEmailVerificationToken(token);

  if (!result.valid) {
    return NextResponse.json(result, { status: 400, headers: frontCorsHeaders() });
  }

  return NextResponse.json(
    { valid: true, email: result.email },
    { status: 200, headers: frontCorsHeaders() },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = verifyEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid email verification payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  if (parsed.data.action === 'request') {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401, headers: frontCorsHeaders() },
      );
    }

    const result = await createEmailVerificationRequest(userId);
    if (!result.ok) {
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status: 400, headers: frontCorsHeaders() },
      );
    }

    return NextResponse.json(
      { message: 'If your account is eligible, a verification email has been sent.' },
      { status: 200, headers: frontCorsHeaders() },
    );
  }

  const result = await confirmEmailVerification(parsed.data.token);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(
    {
      email: result.email,
      message: 'Email verified successfully.',
      redirectPath: '/account/settings?verified=1',
    },
    { status: 200, headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
