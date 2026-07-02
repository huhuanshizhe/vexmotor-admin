import { NextRequest, NextResponse } from 'next/server';

import {
  adminShippingMethodPatchSchema,
  deleteAdminShippingMethod,
  getAdminShippingMethodListItem,
  getAdminShippingMethodTranslations,
  updateAdminShippingMethod,
} from '@/server/admin/shipping-methods';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'CODE_CONFLICT':
      return { status: 409, code: 'CODE_CONFLICT', message: '编码已存在，请使用其他编码' };
    case 'LAST_METHOD':
      return { status: 409, code: 'LAST_METHOD', message: '至少保留一个物流方式' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, translations] = await Promise.all([
    getAdminShippingMethodListItem(id),
    getAdminShippingMethodTranslations(id),
  ]);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Shipping method not found' }, { status: 404 });
  }

  return NextResponse.json({ item, translations });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminShippingMethodPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;

  try {
    const updated = await updateAdminShippingMethod(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Shipping method not found' }, { status: 404 });
    }

    const item = await getAdminShippingMethodListItem(id);
    return NextResponse.json(item);
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const deleted = await deleteAdminShippingMethod(id);
    if (!deleted) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Shipping method not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
