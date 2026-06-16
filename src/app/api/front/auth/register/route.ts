import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signFrontAccessToken } from '@/lib/auth/jwt';
import { registerBusinessAccount } from '@/server/auth/customer-auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  country: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  companySize: z.string().optional().default(''),
  website: z.string().optional().default(''),
  taxId: z.string().optional().default(''),
  annualVolumeEstimate: z.string().optional().default(''),
  documents: z.array(z.string()).optional().default([]),
  termsAccepted: z.literal(true).optional(),
  privacyAccepted: z.literal(true).optional(),
  exportComplianceAccepted: z.literal(true).optional(),
  _quick: z.boolean().optional(),
});

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid registration payload', details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders() },
    );
  }

  const isQuick = parsed.data._quick === true;
  const created = await registerBusinessAccount({
    email: parsed.data.email,
    password: parsed.data.password,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    role: parsed.data.role ?? 'Customer',
    companyName: parsed.data.companyName ?? (isQuick ? 'Individual' : ''),
    country: parsed.data.country ?? '',
    industry: parsed.data.industry ?? '',
    companySize: parsed.data.companySize ?? '',
    website: parsed.data.website ?? '',
    taxId: parsed.data.taxId ?? '',
    annualVolumeEstimate: parsed.data.annualVolumeEstimate ?? '',
    documents: parsed.data.documents ?? [],
    termsAccepted: parsed.data.termsAccepted ?? true,
    privacyAccepted: parsed.data.privacyAccepted ?? true,
    exportComplianceAccepted: parsed.data.exportComplianceAccepted ?? true,
    sourcePageUrl: request.headers.get('referer') ?? '/register',
  });

  if (!created.ok) {
    return NextResponse.json(
      { code: created.code, message: created.message },
      { status: created.code === 'EMAIL_EXISTS' ? 409 : 400, headers: corsHeaders() },
    );
  }

  const token = await signFrontAccessToken(created.user.id, created.user.email);

  return NextResponse.json(
    {
      token,
      user: created.user,
      redirectPath: isQuick ? '/checkout' : '/account?pendingReview=1',
      message: isQuick ? 'Account created successfully.' : 'Business account created and queued for review.',
    },
    { status: 201, headers: corsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
