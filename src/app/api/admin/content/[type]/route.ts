import { and, asc, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/server/db';
import { editorialContentEntries } from '@/server/db/schema';

// In-memory fallback store
const memStore = new Map<string, Map<string, Record<string, unknown>>>();

function getMemCollection(type: string): Map<string, Record<string, unknown>> {
  if (!memStore.has(type)) memStore.set(type, new Map());
  return memStore.get(type)!;
}

const contentSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional().default(''),
  content: z.string().optional().default(''),
  category: z.string().optional(),
  locale: z.enum(['en', 'de', 'fr', 'es']).default('en'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!db) {
    const items = Array.from(getMemCollection(type).values()).map((r) => ({
      ...r,
      category: (r.payload as Record<string, unknown> | undefined)?.category as string ?? '',
    }));
    return NextResponse.json({ items });
  }

  try {
    const rows = await db
      .select({
        id: editorialContentEntries.id,
        title: editorialContentEntries.title,
        slug: editorialContentEntries.slug,
        summary: editorialContentEntries.summary,
        status: editorialContentEntries.status,
        locale: editorialContentEntries.locale,
        category: editorialContentEntries.payload,
      })
      .from(editorialContentEntries)
      .where(eq(editorialContentEntries.contentType, type as typeof editorialContentEntries.contentType.enumValues[number]))
      .orderBy(desc(editorialContentEntries.publishedAt), asc(editorialContentEntries.title));

    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        category: r.category ? (r.category as Record<string, unknown>).category as string ?? '' : '',
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const body = await request.json();
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

  const { category, ...data } = parsed.data;

  if (!db) {
    const id = crypto.randomUUID();
    const entry = { id, ...data, payload: { category }, createdAt: new Date().toISOString() };
    getMemCollection(type).set(id, entry);
    return NextResponse.json(entry, { status: 201 });
  }

  try {
    const [created] = await db
      .insert(editorialContentEntries)
      .values({
        contentType: type as typeof editorialContentEntries.contentType.enumValues[number],
        ...data,
        payload: { category },
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ code: 'CREATE_FAILED' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'MISSING_ID' }, { status: 400 });

  const body = await request.json();
  const parsed = contentSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 });

  const { category, ...data } = parsed.data;

  if (!db) {
    const existing = getMemCollection(type).get(id) as Record<string, unknown> | undefined;
    if (!existing) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const existingPayload = (existing.payload as Record<string, unknown>) ?? {};
    const updated: Record<string, unknown> = { ...existing, ...data, payload: { ...existingPayload, category }, updatedAt: new Date().toISOString() };
    getMemCollection(type).set(id, updated);
    return NextResponse.json(updated);
  }

  try {
    const [updated] = await db
      .update(editorialContentEntries)
      .set({ ...data, payload: { category }, updatedAt: new Date() })
      .where(eq(editorialContentEntries.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ code: 'UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'MISSING_ID' }, { status: 400 });

  if (!db) {
    getMemCollection(type).delete(id);
    return new NextResponse(null, { status: 204 });
  }

  try {
    await db.delete(editorialContentEntries).where(eq(editorialContentEntries.id, id));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ code: 'DELETE_FAILED' }, { status: 500 });
  }
}
