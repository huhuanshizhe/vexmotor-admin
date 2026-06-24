import { NextRequest, NextResponse } from 'next/server';

import {
  adminProductPatchSchema,
  deleteAdminProduct,
  getAdminProductListItem,
  getAdminProductTranslations,
  updateAdminProductShared,
} from '@/server/admin/products';

function mapProductError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'DUPLICATE_SKU':
      return { status: 409, code: 'DUPLICATE_SKU', message: 'SKU 已存在' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, translations] = await Promise.all([
    getAdminProductListItem(id),
    getAdminProductTranslations(id),
  ]);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ item, translations });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminProductPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await updateAdminProductShared(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
    }
    const item = await getAdminProductListItem(id);
    return NextResponse.json(item);
  } catch (error) {
    const mapped = mapProductError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminProduct(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
