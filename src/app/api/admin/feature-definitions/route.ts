import { NextRequest, NextResponse } from 'next/server';

import { normalizePageSize } from '@/lib/admin-list-query';
import {
  adminFeatureDefinitionTranslationSchema,
  createAdminFeatureDefinitionTranslation,
  findAdminFeatureDefinitionByCategoryNameAndLocale,
  findAdminFeatureDefinitionTranslationByDefinitionAndLocale,
  getAdminFeatureDefinitionsPaginated,
  updateAdminFeatureDefinitionTranslation,
} from '@/server/admin/feature-definitions';

function mapFeatureDefinitionError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'DUPLICATE_NAME':
      return { status: 409, code: 'DUPLICATE_NAME', message: '该分类与语言下特性名称已存在' };
    case 'UNIT_REQUIRED':
      return { status: 400, code: 'UNIT_REQUIRED', message: '数值类型必须填写值单位' };
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get('keyword')?.trim() ?? params.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = normalizePageSize(params.get('page_size') ?? params.get('pageSize'));

  const result = await getAdminFeatureDefinitionsPaginated({
    keyword: keyword || undefined,
    page,
    pageSize,
  });

  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      activeCount: result.activeCount,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminFeatureDefinitionTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.definitionId) {
    const existingLocale = await findAdminFeatureDefinitionTranslationByDefinitionAndLocale(
      parsed.data.definitionId,
      parsed.data.locale,
    );
    if (existingLocale) {
      try {
        const updated = await updateAdminFeatureDefinitionTranslation(existingLocale.id, parsed.data);
        if (!updated) {
          return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update feature definition translation' }, { status: 500 });
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
  }

  const duplicate = await findAdminFeatureDefinitionByCategoryNameAndLocale(
    parsed.data.specCategory,
    parsed.data.name,
    parsed.data.locale,
    parsed.data.definitionId,
  );
  if (duplicate) {
    return NextResponse.json({ code: 'DUPLICATE_NAME', message: '该分类与语言下特性名称已存在' }, { status: 409 });
  }

  try {
    const created = await createAdminFeatureDefinitionTranslation(parsed.data);
    if (!created) {
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create feature definition' }, { status: 500 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapFeatureDefinitionError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
