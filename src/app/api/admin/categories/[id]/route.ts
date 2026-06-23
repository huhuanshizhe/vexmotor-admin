import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAdminCategory,
  getAdminCategoryListItem,
  getAdminCategoryTranslations,
  updateAdminCategory,
  adminCategoryPatchSchema,
} from '@/server/admin/categories';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await getAdminCategoryListItem(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  const translations = await getAdminCategoryTranslations(id);
  return NextResponse.json({ item, translations });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminCategoryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateAdminCategory(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteAdminCategory(id);
  if (!result.ok) {
    if (result.reason === 'HAS_CHILDREN') {
      return NextResponse.json({ code: 'HAS_CHILDREN', message: '该分类下还有子分类，无法删除' }, { status: 409 });
    }
    if (result.reason === 'HAS_PRODUCTS') {
      return NextResponse.json({ code: 'HAS_PRODUCTS', message: '该分类下还有产品，无法删除' }, { status: 409 });
    }
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
