import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminContentBlock, getAdminContentBlocks } from '@/server/admin/content';

const contentBlockSchema = z.object({
  placement: z.string().min(1),
  blockKey: z.string().min(1),
  title: z.string().nullable().optional().transform((value) => value ?? null),
  subtitle: z.string().nullable().optional().transform((value) => value ?? null),
  content: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['active', 'inactive']).default('active'),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const items = await getAdminContentBlocks();
  const filtered = search
    ? items.filter((item) => [item.placement, item.blockKey, item.title ?? '', item.subtitle ?? ''].join(' ').toLowerCase().includes(search))
    : items;

  return NextResponse.json({ items: filtered, meta: { total: filtered.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = contentBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createAdminContentBlock(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create content block' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
