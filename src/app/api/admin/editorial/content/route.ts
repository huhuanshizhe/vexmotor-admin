import { NextRequest, NextResponse } from 'next/server';

import {
  adminEditorialBlogEntrySchema,
  adminEditorialPressEntrySchema,
  createAdminEditorialBlogEntry,
  createAdminEditorialPressEntry,
  findAdminEditorialBlogEntryBySlug,
  findAdminEditorialPressEntryBySlug,
  getAdminEditorialBlogEntries,
  getAdminEditorialPressEntries,
} from '@/server/admin/editorial-content';

function resolveContentType(value: string | null | undefined) {
  return value === 'press' ? 'press' : 'blog';
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const contentType = resolveContentType(request.nextUrl.searchParams.get('contentType'));
  const items = contentType === 'press'
    ? await getAdminEditorialPressEntries(search)
    : await getAdminEditorialBlogEntries(search);

  return NextResponse.json({ items, meta: { total: items.length } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const contentType = resolveContentType(typeof body?.contentType === 'string' ? body.contentType : request.nextUrl.searchParams.get('contentType'));
  if (contentType === 'press') {
    const parsed = adminEditorialPressEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await findAdminEditorialPressEntryBySlug(parsed.data.slug, parsed.data.locale);
    if (existing) {
      return NextResponse.json({ code: 'SLUG_CONFLICT', message: 'Slug already exists for this locale' }, { status: 409 });
    }

    const created = await createAdminEditorialPressEntry(parsed.data);
    if (!created) {
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create editorial entry' }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  }

  const parsed = adminEditorialBlogEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await findAdminEditorialBlogEntryBySlug(parsed.data.slug, parsed.data.locale);
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: 'Slug already exists for this locale' }, { status: 409 });
  }

  const created = await createAdminEditorialBlogEntry(parsed.data);
  if (!created) {
    return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create editorial entry' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}