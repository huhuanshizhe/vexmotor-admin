import { NextRequest, NextResponse } from 'next/server';

import { ROOT_CATEGORY_PARENT_KEY } from '@/lib/category-content';
import { normalizePageSize } from '@/lib/admin-list-query';
import {
  adminCategoryTranslationSchema,
  createAdminCategoryTranslation,
  findAdminCategoryTranslationByCategoryAndLocale,
  findAdminCategoryTranslationBySlug,
  getAdminCategoriesPaginated,
  updateAdminCategoryTranslation,
} from '@/server/admin/categories';

function parseParentId(value: string | null) {
  if (!value || value === ROOT_CATEGORY_PARENT_KEY) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get('keyword')?.trim() ?? params.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(params.get('page_size') ?? params.get('pageSize'));
  const parentId = parseParentId(params.get('parent_id'));

  const result = await getAdminCategoriesPaginated({
    parentId,
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
  const parsed = adminCategoryTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.categoryId) {
    const existingLocale = await findAdminCategoryTranslationByCategoryAndLocale(
      parsed.data.categoryId,
      parsed.data.locale,
    );
    if (existingLocale) {
      const updated = await updateAdminCategoryTranslation(existingLocale.id, parsed.data);
      if (!updated) {
        return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update category translation' }, { status: 500 });
      }
      return NextResponse.json(updated);
    }
  }

  const existing = await findAdminCategoryTranslationBySlug(
    parsed.data.slug ?? parsed.data.name,
    parsed.data.locale,
  );
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const created = await createAdminCategoryTranslation(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create category' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
