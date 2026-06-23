import { NextRequest, NextResponse } from 'next/server';

import { normalizePageSize } from '@/lib/admin-list-query';
import {
  adminBrandTranslationSchema,
  createAdminBrandTranslation,
  findAdminBrandTranslationByBrandAndLocale,
  findAdminBrandTranslationBySlug,
  getAdminBrandsPaginated,
  updateAdminBrandTranslation,
} from '@/server/admin/brands';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get('keyword')?.trim() ?? params.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(params.get('page_size') ?? params.get('pageSize'));

  const result = await getAdminBrandsPaginated({
    keyword: keyword || undefined,
    page,
    pageSize,
  });

  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminBrandTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.brandId) {
    const existingLocale = await findAdminBrandTranslationByBrandAndLocale(
      parsed.data.brandId,
      parsed.data.locale,
    );
    if (existingLocale) {
      const updated = await updateAdminBrandTranslation(existingLocale.id, parsed.data);
      if (!updated) {
        return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update brand translation' }, { status: 500 });
      }
      return NextResponse.json(updated);
    }
  }

  const existing = await findAdminBrandTranslationBySlug(
    parsed.data.slug ?? parsed.data.name,
    parsed.data.locale,
  );
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const created = await createAdminBrandTranslation(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create brand' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
