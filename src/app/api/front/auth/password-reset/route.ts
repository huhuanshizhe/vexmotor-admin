import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';

import { createPasswordResetRequest, resetPasswordWithToken } from '@/server/auth/customer-auth';

const passwordResetRequestSchema = z.object({
  action: z.literal('request'),
  email: z.string().email(),
});

const passwordResetConfirmSchema = z.object({
  action: z.literal('reset'),
  token: z.string().min(1),
  password: z.string().min(8),
});

const passwordResetSchema = z.union([passwordResetRequestSchema, passwordResetConfirmSchema]);



export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = passwordResetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid password reset payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  if (parsed.data.action === 'request') {
    const result = await createPasswordResetRequest(parsed.data.email);
    return NextResponse.json(
      {
        message: 'If the account exists, a reset link has been prepared.',
        resetUrl: result.resetUrl,
      },
      { status: 200, headers: frontCorsHeaders() },
    );
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.ok) {
    return NextResponse.json({ code: result.code, message: result.message }, { status: 400, headers: frontCorsHeaders() });
  }

  return NextResponse.json(
    {
      email: result.email,
      redirectPath: '/login?reset=1',
      message: 'Password reset complete.',
    },
    { status: 200, headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
