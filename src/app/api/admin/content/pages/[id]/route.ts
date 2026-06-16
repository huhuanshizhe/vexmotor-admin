import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteAdminCmsPage, getAdminCmsPage, updateAdminCmsPage } from '@/server/admin/content';

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  summary: z.string().nullable().optional().transform((value) => value ?? null),
  content: z.string().nullable().optional().transform((value) => value ?? null),
  seoTitle: z.string().nullable().optional().transform((value) => value ?? null),
  seoDescription: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  publishedAt: z.coerce.date().nullable().optional().transform((value) => value ?? null),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminCmsPage(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Page not found' }, { status: 404 });
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
  const updated = await updateAdminCmsPage(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Page not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminCmsPage(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Page not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
