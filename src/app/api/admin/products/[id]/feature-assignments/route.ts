import { NextRequest, NextResponse } from 'next/server';

import {
  createAdminProductFeatureAssignment,
  listAdminProductFeatureAssignments,
  listAvailableFeatureDefinitionsForProduct,
  productFeatureAssignmentCreateSchema,
} from '@/server/admin/product-features';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'DEFINITION_NOT_FOUND':
      return { status: 404, code: 'DEFINITION_NOT_FOUND', message: '特性定义不存在' };
    case 'DEFINITION_INACTIVE':
      return { status: 400, code: 'DEFINITION_INACTIVE', message: '特性定义已停用' };
    case 'DUPLICATE_ASSIGNMENT':
      return { status: 409, code: 'DUPLICATE_ASSIGNMENT', message: '该产品已添加此特性' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [items, available] = await Promise.all([
    listAdminProductFeatureAssignments(id),
    listAvailableFeatureDefinitionsForProduct(id),
  ]);
  return NextResponse.json({ items, available });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = productFeatureAssignmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const created = await createAdminProductFeatureAssignment(id, parsed.data.definitionId);
    if (!created) {
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create assignment' }, { status: 500 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
