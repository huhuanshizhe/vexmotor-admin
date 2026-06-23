import { NextRequest, NextResponse } from 'next/server';

import {
  adminCategoryTranslationPatchSchema,
  findAdminCategoryTranslationBySlug,
  getAdminCategoryTranslation,
  updateAdminCategoryTranslation,
} from '@/server/admin/categories';

export async function GET(_: Request, { params }: { params: Promise<{ translationId: string }> }) {
  const { translationId } = await params;
  const item = await getAdminCategoryTranslation(translationId);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category translation not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminCategoryTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;
  const current = await getAdminCategoryTranslation(translationId);
  if (!current) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category translation not found' }, { status: 404 });
  }

  const nextSlug = parsed.data.slug ?? current.slug;
  const nextLocale = parsed.data.locale ?? current.locale;
  const existing = await findAdminCategoryTranslationBySlug(nextSlug, nextLocale, translationId);
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  const updated = await updateAdminCategoryTranslation(translationId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category translation not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
