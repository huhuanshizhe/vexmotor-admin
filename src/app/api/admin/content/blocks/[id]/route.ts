import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteAdminContentBlock, getAdminContentBlock, updateAdminContentBlock } from '@/server/admin/content';

const patchSchema = z.object({
  placement: z.string().min(1).optional(),
  blockKey: z.string().min(1).optional(),
  title: z.string().nullable().optional().transform((value) => value ?? null),
  subtitle: z.string().nullable().optional().transform((value) => value ?? null),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminContentBlock(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Content block not found' }, { status: 404 });
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
  const updated = await updateAdminContentBlock(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Content block not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminContentBlock(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Content block not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
