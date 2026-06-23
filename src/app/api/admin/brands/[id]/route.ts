import { NextRequest, NextResponse } from 'next/server';

import {
  adminBrandPatchSchema,
  deleteAdminBrand,
  getAdminBrandListItem,
  getAdminBrandTranslations,
  updateAdminBrand,
} from '@/server/admin/brands';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, translations] = await Promise.all([
    getAdminBrandListItem(id),
    getAdminBrandTranslations(id),
  ]);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json({ item, translations });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminBrandPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateAdminBrand(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminBrand(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
