import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminCmsPage, getAdminCmsPages } from '@/server/admin/content';

const cmsPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable().optional().transform((value) => value ?? null),
  content: z.string().nullable().optional().transform((value) => value ?? null),
  seoTitle: z.string().nullable().optional().transform((value) => value ?? null),
  seoDescription: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishedAt: z.coerce.date().nullable().optional().transform((value) => value ?? null),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const items = await getAdminCmsPages();
  const filtered = search
    ? items.filter((item) => [item.title, item.slug, item.summary ?? '', item.seoTitle ?? ''].join(' ').toLowerCase().includes(search))
    : items;

  return NextResponse.json({ items: filtered, meta: { total: filtered.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = cmsPageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createAdminCmsPage(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create page' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
