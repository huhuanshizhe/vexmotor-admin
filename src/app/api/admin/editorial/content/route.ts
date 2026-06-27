import { NextRequest, NextResponse } from 'next/server';

import { normalizePageSize } from '@/lib/admin-list-query';
import {
  type EditorialContentModule,
  editorialContentModules,
  resolveContentModuleByBoard,
} from '@/lib/editorial-content';
import {
  adminEditorialContentTranslationSchema,
  createAdminEditorialContentTranslation,
  findAdminEditorialContentTranslationByContentAndLocale,
  findAdminEditorialContentTranslationBySlug,
  getAdminEditorialContentListPaginated,
  updateAdminEditorialContentTranslation,
} from '@/server/admin/editorial-content';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get('keyword')?.trim() ?? params.get('search')?.trim() ?? '';
  const boardKey = params.get('board_key')?.trim() ?? params.get('board')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(params.get('page_size') ?? params.get('pageSize'));
  const knownBoardKeys = params.get('known_board_keys')?.split(',').map((value) => value.trim()).filter(Boolean);
  const moduleParam = params.get('module')?.trim() ?? '';
  const contentModule: EditorialContentModule | undefined = editorialContentModules.includes(moduleParam as EditorialContentModule)
    ? moduleParam as EditorialContentModule
    : undefined;

  const result = await getAdminEditorialContentListPaginated({
    boardKey: boardKey || undefined,
    keyword: keyword || undefined,
    page,
    pageSize,
    knownBoardKeys: knownBoardKeys?.length ? knownBoardKeys : undefined,
    contentModule,
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
  const parsed = adminEditorialContentTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const contentModule = parsed.data.contentModule
    ?? (parsed.data.boardKey ? resolveContentModuleByBoard(parsed.data.boardKey) : 'editorial');
  const boardKeys = parsed.data.boardKeys?.length
    ? parsed.data.boardKeys
    : parsed.data.boardKey
      ? [parsed.data.boardKey]
      : [];

  if (!boardKeys.length) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'boardKey or boardKeys is required' }, { status: 400 });
  }

  if (parsed.data.contentId) {
    const existingLocale = await findAdminEditorialContentTranslationByContentAndLocale(
      parsed.data.contentId,
      parsed.data.locale,
    );
    if (existingLocale) {
      const updated = await updateAdminEditorialContentTranslation(existingLocale.id, parsed.data);
      if (!updated) {
        return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update editorial translation' }, { status: 500 });
      }
      return NextResponse.json(updated);
    }
  }

  const existing = await findAdminEditorialContentTranslationBySlug(
    parsed.data.slug ?? parsed.data.title,
    parsed.data.locale,
    undefined,
    contentModule,
  );
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const created = await createAdminEditorialContentTranslation(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create editorial content' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
