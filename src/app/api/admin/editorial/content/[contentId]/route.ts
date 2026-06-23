import { NextRequest, NextResponse } from 'next/server';

import {
  adminEditorialContentPatchSchema,
  deleteAdminEditorialContent,
  getAdminEditorialContentListItem,
  getAdminEditorialContentTranslations,
  updateAdminEditorialContent,
} from '@/server/admin/editorial-content';

export async function GET(_: Request, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const [item, translations] = await Promise.all([
    getAdminEditorialContentListItem(contentId),
    getAdminEditorialContentTranslations(contentId),
  ]);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial content not found' }, { status: 404 });
  }

  return NextResponse.json({ item, translations, items: translations, meta: { total: translations.length, contentId } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const body = await request.json();
  const parsed = adminEditorialContentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { contentId } = await params;
  const updated = await updateAdminEditorialContent(contentId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial content not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const deleted = await deleteAdminEditorialContent(contentId);

  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial content not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
