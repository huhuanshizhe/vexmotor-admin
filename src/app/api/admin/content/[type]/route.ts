import { and, asc, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/server/db';
import { editorialContentTranslations, editorialContents } from '@/server/db/schema';

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
  const rows = await db
    .select({
      id: editorialContentTranslations.id,
      contentId: editorialContents.id,
      title: editorialContentTranslations.title,
      slug: editorialContentTranslations.slug,
      summary: editorialContentTranslations.summary,
      status: editorialContents.status,
      locale: editorialContentTranslations.locale,
      payload: editorialContentTranslations.payload,
    })
    .from(editorialContents)
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(eq(editorialContents.contentType, type as typeof editorialContents.contentType.enumValues[number]))
    .orderBy(desc(editorialContents.publishedAt), asc(editorialContentTranslations.title));

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r,
      category: r.payload?.tags?.[0] ?? '',
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  await params;
  const body = await request.json();
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

  const { category, content, status, locale, ...data } = parsed.data;
  const payload = {
    body: content,
    coverUrl: null,
    coverAlt: null,
    tags: category ? [category] : [],
    relatedProductSlugs: [],
    authorName: null,
    authorTitle: null,
    authorBio: null,
    category: null,
  };

  const [createdContent] = await db
    .insert(editorialContents)
    .values({
      contentType: 'content',
      boardKey: 'content',
      status,
      publishedAt: status === 'published' ? new Date() : null,
    })
    .returning();

  const [created] = await db
    .insert(editorialContentTranslations)
    .values({
      contentId: createdContent.id,
      contentType: 'content',
      locale,
      title: data.title,
      slug: data.slug,
      summary: data.summary || null,
      payload,
    })
    .returning();

  return NextResponse.json({ ...created, status: createdContent.status }, { status: 201 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  await params;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'MISSING_ID' }, { status: 400 });

  const body = await request.json();
  const parsed = contentSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 });

  const { category, content, status, locale, ...data } = parsed.data;

  const [current] = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(eq(editorialContentTranslations.id, id))
    .limit(1);

  if (!current) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  if (status !== undefined) {
    await db
      .update(editorialContents)
      .set({
        status,
        publishedAt: status === 'published' ? new Date() : current.content.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(editorialContents.id, current.content.id));
  }

  const [updated] = await db
    .update(editorialContentTranslations)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(locale !== undefined ? { locale } : {}),
      payload: {
        body: content ?? current.translation.payload.body,
        coverUrl: current.translation.payload.coverUrl,
        coverAlt: current.translation.payload.coverAlt,
        tags: category ? [category] : current.translation.payload.tags,
        relatedProductSlugs: current.translation.payload.relatedProductSlugs,
      },
      updatedAt: new Date(),
    })
    .where(eq(editorialContentTranslations.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  await params;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'MISSING_ID' }, { status: 400 });

  const [row] = await db
    .select({ contentId: editorialContentTranslations.contentId })
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.id, id))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 204 });

  await db.delete(editorialContents).where(eq(editorialContents.id, row.contentId));
  return new NextResponse(null, { status: 204 });
}
