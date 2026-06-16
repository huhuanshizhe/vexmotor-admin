import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = passwordResetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid password reset payload', details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders() },
    );
  }

  if (parsed.data.action === 'request') {
    const result = await createPasswordResetRequest(parsed.data.email);
    return NextResponse.json(
      {
        message: 'If the account exists, a reset link has been prepared.',
        resetUrl: result.resetUrl,
      },
      { status: 200, headers: corsHeaders() },
    );
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.ok) {
    return NextResponse.json({ code: result.code, message: result.message }, { status: 400, headers: corsHeaders() });
  }

  return NextResponse.json(
    {
      email: result.email,
      redirectPath: '/login?reset=1',
      message: 'Password reset complete.',
    },
    { status: 200, headers: corsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
