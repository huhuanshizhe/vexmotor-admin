import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { COMMON_CURRENCY_CODES } from '@/lib/currencies';
import { COMMON_LANGUAGE_CODES } from '@/lib/languages';
import { addAdminSiteLanguage, getAdminSiteLanguages, getAvailableCommonLanguages } from '@/server/admin/languages';

const createLanguageSchema = z.object({
  code: z.string().refine((value) => COMMON_LANGUAGE_CODES.includes(value), 'Unsupported language code'),
  currencyCode: z.string().refine((value) => COMMON_CURRENCY_CODES.includes(value), 'Unsupported currency code'),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const [items, availableLanguages] = await Promise.all([getAdminSiteLanguages(), getAvailableCommonLanguages()]);
  const filtered = search
    ? items.filter((item) =>
        [item.code, item.name, item.nativeName, item.region, item.currencyCode, item.countryCodes.join(' ')].join(' ').toLowerCase().includes(search),
      )
    : items;

  return NextResponse.json({
    items: filtered,
    availableLanguages,
    meta: { total: filtered.length, available: availableLanguages.length },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await addAdminSiteLanguage(parsed.data.code, parsed.data.currencyCode);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to add language' }, { status: 400 });
  }

  return NextResponse.json(created, { status: 201 });
}

