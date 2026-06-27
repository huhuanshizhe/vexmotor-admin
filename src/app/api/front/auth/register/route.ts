import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signFrontAccessToken } from '@/lib/auth/jwt';
import { frontCorsHeaders } from '@/lib/front-cors';
import { registerBusinessAccount, registerEmailAccount } from '@/server/auth/customer-auth';

const registrationDocumentSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  companyName: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  documents: z.array(registrationDocumentSchema).max(5).optional().default([]),
  termsAccepted: z.literal(true).optional(),
  privacyAccepted: z.literal(true).optional(),
  exportComplianceAccepted: z.literal(true).optional(),
  _quick: z.boolean().optional(),
});

function isBusinessRegistration(data: z.infer<typeof registerSchema>) {
  return data.exportComplianceAccepted === true
    && data.termsAccepted === true
    && data.privacyAccepted === true
    && data._quick !== true;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid registration payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const isQuick = parsed.data._quick === true;
  const created = isBusinessRegistration(parsed.data)
    ? await registerBusinessAccount({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        jobTitle: parsed.data.jobTitle,
        companyName: parsed.data.companyName?.trim() ?? '',
        country: parsed.data.country ?? '',
        industry: parsed.data.industry ?? '',
        companySize: parsed.data.companySize ?? '',
        website: parsed.data.website ?? '',
        taxId: parsed.data.taxId ?? '',
        documents: parsed.data.documents ?? [],
        termsAccepted: parsed.data.termsAccepted ?? true,
        privacyAccepted: parsed.data.privacyAccepted ?? true,
        exportComplianceAccepted: parsed.data.exportComplianceAccepted ?? true,
      })
    : await registerEmailAccount({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        companyName: parsed.data.companyName,
        industry: parsed.data.industry,
        country: parsed.data.country,
        companySize: parsed.data.companySize,
        website: parsed.data.website,
        taxId: parsed.data.taxId,
        termsAccepted: parsed.data.termsAccepted,
        privacyAccepted: parsed.data.privacyAccepted,
      });

  if (!created.ok) {
    return NextResponse.json(
      { code: created.code, message: created.message },
      { status: created.code === 'EMAIL_EXISTS' ? 409 : 400, headers: frontCorsHeaders() },
    );
  }

  const token = await signFrontAccessToken(created.user.id, created.user.email);

  return NextResponse.json(
    {
      token,
      user: created.user,
      redirectPath: isQuick ? '/checkout' : '/account',
      message: 'Account created successfully.',
    },
    { status: 201, headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
