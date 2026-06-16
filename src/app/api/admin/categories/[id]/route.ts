import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteAdminCategory, getAdminCategory, updateAdminCategory } from '@/server/admin/categories';

const patchSchema = z.object({
  parentId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional().transform((value) => value ?? null),
  imageUrl: z.string().nullable().optional().transform((value) => value ?? null),
  seoTitle: z.string().nullable().optional().transform((value) => value ?? null),
  seoDescription: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(['active', 'inactive']).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.coerce.number().int().min(0).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminCategory(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateAdminCategory(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminCategory(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Category not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
