import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/server/db';
import { productTranslations } from '@/server/db/schema';

const translationSchema = z.object({
  locale: z.enum(['en', 'de', 'fr', 'es']),
  name: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json([]);

  const rows = await db
    .select()
    .from(productTranslations)
    .where(eq(productTranslations.productId, id));

  return NextResponse.json(rows);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = translationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const { locale, ...fields } = parsed.data;

  if (!db) {
    return NextResponse.json({ code: 'DB_UNAVAILABLE' }, { status: 503 });
  }

  const existing = await db
    .select({ id: productTranslations.id })
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, id), eq(productTranslations.locale, locale)))
    .limit(1);

  if (existing.length) {
    const [updated] = await db
      .update(productTranslations)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(productTranslations.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(productTranslations)
    .values({ productId: id, locale, ...fields })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
