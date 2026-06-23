import { NextRequest, NextResponse } from 'next/server';

import {
  adminEditorialContentTranslationPatchSchema,
  findAdminEditorialContentTranslationBySlug,
  getAdminEditorialContentTranslation,
  updateAdminEditorialContentTranslation,
} from '@/server/admin/editorial-content';
import { resolveContentModuleByBoard } from '@/lib/editorial-content';

export async function GET(_: Request, { params }: { params: Promise<{ translationId: string }> }) {
  const { translationId } = await params;
  const item = await getAdminEditorialContentTranslation(translationId);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial translation not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminEditorialContentTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;
  const current = await getAdminEditorialContentTranslation(translationId);
  if (!current) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial translation not found' }, { status: 404 });
  }

  const nextSlug = parsed.data.slug ?? current.slug;
  const nextLocale = parsed.data.locale ?? current.locale;
  const nextBoardKey = parsed.data.boardKey ?? current.boardKey;
  const contentModule = parsed.data.contentModule ?? resolveContentModuleByBoard(nextBoardKey);
  const existing = await findAdminEditorialContentTranslationBySlug(nextSlug, nextLocale, translationId, contentModule);
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const updated = await updateAdminEditorialContentTranslation(translationId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial translation not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
