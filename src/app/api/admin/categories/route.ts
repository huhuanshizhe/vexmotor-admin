import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminCategory, getAdminCategories } from '@/server/admin/categories';

const categorySchema = z.object({
  parentId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional().transform((value) => value ?? null),
  imageUrl: z.string().nullable().optional().transform((value) => value ?? null),
  seoTitle: z.string().nullable().optional().transform((value) => value ?? null),
  seoDescription: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(['active', 'inactive']).default('active'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  featuredOrder: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const items = await getAdminCategories();
  const filtered = search
    ? items.filter((item) => [item.name, item.slug, item.description ?? ''].join(' ').toLowerCase().includes(search))
    : items;

  return NextResponse.json({ items: filtered, meta: { total: filtered.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createAdminCategory(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create category' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
