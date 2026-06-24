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
      return { status: 400, code: 'UNIT_REQUIRED', message: '数值或范围类型必须填写值单位' };
    case 'VALUE_REQUIRED':
      return { status: 400, code: 'VALUE_REQUIRED', message: '请填写特性值' };
    case 'RANGE_INVALID':
      return { status: 400, code: 'RANGE_INVALID', message: '范围最小值不能大于最大值' };
    case 'SELECT_INVALID':
      return { status: 400, code: 'SELECT_INVALID', message: '请选择有效的下拉选项' };
    case 'SELECT_OPTIONS_REQUIRED':
      return { status: 400, code: 'SELECT_OPTIONS_REQUIRED', message: '下拉类型必须配置选项列表' };
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
