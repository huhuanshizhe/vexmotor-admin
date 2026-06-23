import { NextRequest, NextResponse } from 'next/server';

import {
  adminEditorialContentTranslationSchema,
  createAdminEditorialContentTranslation,
  findAdminEditorialContentTranslationBySlug,
  getAdminEditorialContentList,
} from '@/server/admin/editorial-content';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const items = await getAdminEditorialContentList(search);

  return NextResponse.json({ items, meta: { total: items.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminEditorialContentTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await findAdminEditorialContentTranslationBySlug(parsed.data.slug, parsed.data.locale);
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const created = await createAdminEditorialContentTranslation(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create editorial content' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
