import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { changeUserPassword } from '@/server/auth/customer-auth';
import { getCurrentUserId } from '@/server/auth/session';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid change-password payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await changeUserPassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    const status = result.code === 'INVALID_PASSWORD' ? 400 : 401;
    return NextResponse.json({ code: result.code, message: result.message }, { status, headers: frontCorsHeaders() });
  }

  return NextResponse.json({ ok: true }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
