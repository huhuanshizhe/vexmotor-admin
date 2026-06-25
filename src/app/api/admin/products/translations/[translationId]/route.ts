import { NextRequest, NextResponse } from 'next/server';

import {
  adminProductTranslationPatchSchema,
  getAdminProductTranslation,
  updateAdminProductTranslation,
} from '@/server/admin/products';

function mapProductError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'SLUG_CONFLICT':
      return { status: 409, code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' };
    case 'DUPLICATE_SPU':
      return { status: 409, code: 'DUPLICATE_SPU', message: 'SPU 已存在' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ translationId: string }> }) {
  const { translationId } = await params;
  const item = await getAdminProductTranslation(translationId);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminProductTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;
  try {
    const updated = await updateAdminProductTranslation(translationId, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const mapped = mapProductError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
