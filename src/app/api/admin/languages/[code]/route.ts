import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { COMMON_CURRENCY_CODES } from '@/lib/currencies';
import { updateAdminSiteLanguage } from '@/server/admin/languages';

const updateLanguageSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  currencyCode: z.string().refine((value) => COMMON_CURRENCY_CODES.includes(value), 'Unsupported currency code').optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const body = await request.json();
  const parsed = updateLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { code } = await params;
  const updated = await updateAdminSiteLanguage(decodeURIComponent(code), parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update language' }, { status: 400 });
  }

  return NextResponse.json(updated);
}

