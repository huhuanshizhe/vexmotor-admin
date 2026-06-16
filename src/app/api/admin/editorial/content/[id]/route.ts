import { NextRequest, NextResponse } from 'next/server';

import {
  adminEditorialBlogEntryPatchSchema,
  adminEditorialPressEntryPatchSchema,
  deleteAdminEditorialBlogEntry,
  deleteAdminEditorialPressEntry,
  findAdminEditorialBlogEntryBySlug,
  findAdminEditorialPressEntryBySlug,
  getAdminEditorialBlogEntry,
  getAdminEditorialPressEntry,
  updateAdminEditorialBlogEntry,
  updateAdminEditorialPressEntry,
} from '@/server/admin/editorial-content';

function resolveContentType(value: string | null | undefined) {
  return value === 'press' ? 'press' : 'blog';
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contentType = resolveContentType(new URL(request.url).searchParams.get('contentType'));
  const item = contentType === 'press'
    ? await getAdminEditorialPressEntry(id)
    : await getAdminEditorialBlogEntry(id);

  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const contentType = resolveContentType(typeof body?.contentType === 'string' ? body.contentType : request.nextUrl.searchParams.get('contentType'));
  const { id } = await params;
  if (contentType === 'press') {
    const parsed = adminEditorialPressEntryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const current = await getAdminEditorialPressEntry(id);
    if (!current) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
    }

    const nextSlug = parsed.data.slug ?? current.slug;
    const nextLocale = parsed.data.locale ?? current.locale;
    const existing = await findAdminEditorialPressEntryBySlug(nextSlug, nextLocale, id);
    if (existing) {
      return NextResponse.json({ code: 'SLUG_CONFLICT', message: 'Slug already exists for this locale' }, { status: 409 });
    }

    const updated = await updateAdminEditorialPressEntry(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  }

  const parsed = adminEditorialBlogEntryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const current = await getAdminEditorialBlogEntry(id);
  if (!current) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
  }

  const nextSlug = parsed.data.slug ?? current.slug;
  const nextLocale = parsed.data.locale ?? current.locale;
  const existing = await findAdminEditorialBlogEntryBySlug(nextSlug, nextLocale, id);
  if (existing) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: 'Slug already exists for this locale' }, { status: 409 });
  }

  const updated = await updateAdminEditorialBlogEntry(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contentType = resolveContentType(new URL(request.url).searchParams.get('contentType'));
  const deleted = contentType === 'press'
    ? await deleteAdminEditorialPressEntry(id)
    : await deleteAdminEditorialBlogEntry(id);

  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Editorial entry not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}