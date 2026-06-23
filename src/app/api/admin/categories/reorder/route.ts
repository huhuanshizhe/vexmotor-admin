import { NextRequest, NextResponse } from 'next/server';

import { adminCategoryReorderSchema, reorderAdminCategories } from '@/server/admin/categories';

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = adminCategoryReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const tree = await reorderAdminCategories(parsed.data.moves);
    return NextResponse.json({ tree });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REORDER_FAILED';
    if (message === 'CYCLE_DETECTED') {
      return NextResponse.json({ code: 'CYCLE_DETECTED', message: '不能将分类移动到其子分类下' }, { status: 409 });
    }
    return NextResponse.json({ code: 'REORDER_FAILED', message: '排序保存失败' }, { status: 500 });
  }
}
