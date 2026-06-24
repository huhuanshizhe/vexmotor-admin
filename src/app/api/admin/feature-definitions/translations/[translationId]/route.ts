import { NextRequest, NextResponse } from 'next/server';

import {
  adminFeatureDefinitionTranslationPatchSchema,
  getAdminFeatureDefinitionTranslation,
  updateAdminFeatureDefinitionTranslation,
} from '@/server/admin/feature-definitions';

function mapFeatureDefinitionError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'DUPLICATE_NAME':
      return { status: 409, code: 'DUPLICATE_NAME', message: '该分类与语言下特性名称已存在' };
    case 'UNIT_REQUIRED':
      return { status: 400, code: 'UNIT_REQUIRED', message: '数值类型必须填写值单位' };
    case 'INVALID_KEY':
      return { status: 400, code: 'INVALID_KEY', message: 'Key 只能包含小写英文字母和连字符' };
    case 'DUPLICATE_KEY':
      return { status: 409, code: 'DUPLICATE_KEY', message: 'Key 已被占用' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ translationId: string }> }) {
  const { translationId } = await params;
  const item = await getAdminFeatureDefinitionTranslation(translationId);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminFeatureDefinitionTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;
  try {
    const updated = await updateAdminFeatureDefinitionTranslation(translationId, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const mapped = mapFeatureDefinitionError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
