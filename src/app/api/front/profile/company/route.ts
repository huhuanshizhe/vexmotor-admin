import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { getCompanyProfile, updateCompanyProfile } from '@/server/storefront/account';

const patchSchema = z.object({
  company: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  companyCountryCode: z.string().length(2).nullable().optional(),
  companyState: z.string().nullable().optional(),
  companyCity: z.string().nullable().optional(),
  companyAddressLine1: z.string().nullable().optional(),
  companyAddressLine2: z.string().nullable().optional(),
  companyPostalCode: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  companySize: z.string().nullable().optional(),
  annualVolumeEstimate: z.string().max(255).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const company = await getCompanyProfile(userId);
  if (!company) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Profile not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(company, { headers: frontCorsHeaders() });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid company profile payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const updated = await updateCompanyProfile(userId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Profile not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(updated, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
