import { NextRequest, NextResponse } from 'next/server';

import type { AdminProductTranslation } from '@/lib/product-content';
import { getAdminProductTranslations, updateAdminProductTranslation } from '@/server/admin/products';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await getAdminProductTranslations(id);
  return NextResponse.json(rows);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { locale?: string };
  const translations = await getAdminProductTranslations(id);
  const existing = translations.find((item: AdminProductTranslation) => item.locale === body.locale);

  if (!existing) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
  }

  const updated = await updateAdminProductTranslation(existing.id, body);
  return NextResponse.json(updated);
}
