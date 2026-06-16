import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminBrand, getAdminBrands } from '@/server/admin/brands';

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional().transform((value) => value ?? null),
  logoUrl: z.string().nullable().optional().transform((value) => value ?? null),
  websiteUrl: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';
  const items = await getAdminBrands();
  const filtered = search
    ? items.filter((item) => [item.name, item.slug, item.description ?? ''].join(' ').toLowerCase().includes(search))
    : items;

  return NextResponse.json({ items: filtered, meta: { total: filtered.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = brandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createAdminBrand(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create brand' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
