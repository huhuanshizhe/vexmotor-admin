import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAdminProductFeatureValue,
  getAdminProductFeatureValueDetail,
  productFeatureValuePatchSchema,
  productFeatureValueTranslationsSaveSchema,
  saveAdminProductFeatureValueTranslations,
  updateAdminProductFeatureValue,
} from '@/server/admin/product-features';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === 'VALUE_REQUIRED') {
    return { status: 400, code: 'VALUE_REQUIRED', message: '请填写特性值' };
  }
  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; assignmentId: string; valueId: string }> }) {
  const { valueId } = await params;
  const detail = await getAdminProductFeatureValueDetail(valueId);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Value not found' }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string; valueId: string }> }) {
  const body = await request.json();
  const parsed = productFeatureValuePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { valueId } = await params;
  const updated = await updateAdminProductFeatureValue(valueId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Value not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; assignmentId: string; valueId: string }> }) {
  const { valueId } = await params;
  const deleted = await deleteAdminProductFeatureValue(valueId);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Value not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string; valueId: string }> }) {
  const body = await request.json();
  const parsed = productFeatureValueTranslationsSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { valueId } = await params;
  try {
    const saved = await saveAdminProductFeatureValueTranslations(valueId, parsed.data);
    if (!saved) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Value not found' }, { status: 404 });
    }
    return NextResponse.json(saved);
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
