import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { cmsPages, contentBlocks } from '@/server/db/schema';

export type AdminContentBlockRow = {
  id: string;
  placement: string;
  blockKey: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCmsPageRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminContentBlockInput = {
  placement: string;
  blockKey: string;
  title?: string | null;
  subtitle?: string | null;
  content?: Record<string, unknown>;
  status: 'active' | 'inactive';
  sortOrder?: number;
};

export type AdminCmsPageInput = {
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date | null;
};

export async function getAdminContentBlocks() {
  return db.select().from(contentBlocks).orderBy(asc(contentBlocks.sortOrder), desc(contentBlocks.updatedAt));
}

export async function getAdminContentBlock(id: string) {
  const rows = await getAdminContentBlocks();
  return rows.find((item) => item.id === id) ?? null;
}

export async function createAdminContentBlock(input: AdminContentBlockInput) {
  const [created] = await db
    .insert(contentBlocks)
    .values({
      placement: input.placement,
      blockKey: input.blockKey,
      title: input.title ?? null,
      subtitle: input.subtitle ?? null,
      content: input.content ?? {},
      status: input.status,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  return created ?? null;
}

export async function updateAdminContentBlock(id: string, input: Partial<AdminContentBlockInput>) {
  const [updated] = await db
    .update(contentBlocks)
    .set({
      placement: input.placement,
      blockKey: input.blockKey,
      title: input.title,
      subtitle: input.subtitle,
      content: input.content,
      status: input.status,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(contentBlocks.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteAdminContentBlock(id: string) {
  const [deleted] = await db.delete(contentBlocks).where(eq(contentBlocks.id, id)).returning({ id: contentBlocks.id });
  return Boolean(deleted);
}

export async function getAdminCmsPages() {
  return db.select().from(cmsPages).orderBy(desc(cmsPages.updatedAt), asc(cmsPages.title));
}

export async function getAdminCmsPage(id: string) {
  const rows = await getAdminCmsPages();
  return rows.find((item) => item.id === id) ?? null;
}

export async function createAdminCmsPage(input: AdminCmsPageInput) {
  const publishedAt = input.status === 'published' ? input.publishedAt ?? new Date() : input.publishedAt ?? null;
  const [created] = await db
    .insert(cmsPages)
    .values({
      title: input.title,
      slug: input.slug,
      summary: input.summary ?? null,
      content: input.content ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      status: input.status,
      publishedAt,
    })
    .returning();

  return created ?? null;
}

export async function updateAdminCmsPage(id: string, input: Partial<AdminCmsPageInput>) {
  const publishedAt = typeof input.status === 'undefined'
    ? input.publishedAt
    : input.status === 'published'
      ? input.publishedAt ?? new Date()
      : null;

  const [updated] = await db
    .update(cmsPages)
    .set({
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      content: input.content,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      status: input.status,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(cmsPages.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteAdminCmsPage(id: string) {
  const [deleted] = await db.delete(cmsPages).where(eq(cmsPages.id, id)).returning({ id: cmsPages.id });
  return Boolean(deleted);
}
