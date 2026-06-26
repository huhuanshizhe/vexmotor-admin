import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signFrontAccessToken } from '@/lib/auth/jwt';
import { frontCorsHeaders } from '@/lib/front-cors';
import { compareMd5 } from '@/lib/auth/password';
import { getAuthUserByEmail } from '@/server/auth/customer-auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid login payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await getAuthUserByEmail(email);
  if (!user || user.status === 'disabled' || !compareMd5(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const token = await signFrontAccessToken(user.id, user.email);
  return NextResponse.json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        status: user.status,
      },
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
