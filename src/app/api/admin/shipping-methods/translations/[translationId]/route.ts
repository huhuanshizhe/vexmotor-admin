import { NextRequest, NextResponse } from 'next/server';

import {
  adminShippingMethodTranslationPatchSchema,
  updateAdminShippingMethodTranslation,
} from '@/server/admin/shipping-methods';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === 'CODE_CONFLICT') {
    return { status: 409, code: 'CODE_CONFLICT', message: '编码已存在，请使用其他编码' };
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminShippingMethodTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;

  try {
    const updated = await updateAdminShippingMethodTranslation(translationId, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
