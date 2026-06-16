import 'server-only';

import { randomUUID } from 'node:crypto';

import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { type BlogPost, blogCategories, blogIndustries, blogPosts, blogProductTopics } from '@/lib/blog';
import {
  type AdminEditorialPressEntry,
  editorialEntryStatuses,
  type AdminEditorialBlogEntry,
  type EditorialBlogEntryPayload,
  type EditorialPressEntryPayload,
} from '@/lib/editorial-content';
import { createPressReleaseSlug, pressReleases, type PressRelease } from '@/lib/press';
import { db } from '@/server/db';
import { editorialContentEntries } from '@/server/db/schema';

const blogBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal('list'),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('code'),
    language: z.string().min(1),
    code: z.string().min(1),
  }),
  z.object({
    type: z.literal('table'),
    caption: z.string().min(1),
    columns: z.array(z.string().min(1)).min(1),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal('product'),
    productSlug: z.string().min(1),
    eyebrow: z.string().min(1),
    body: z.string().min(1),
  }),
]);

const blogSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(blogBlockSchema).min(1),
});

export const editorialPressPayloadSchema = z.object({
  category: z.string().trim().min(1),
});

export const editorialBlogPayloadSchema = z.object({
  lead: z.string().min(1),
  category: z.enum(blogCategories),
  productTopics: z.array(z.enum(blogProductTopics)).min(1),
  industry: z.enum(blogIndustries),
  authorId: z.string().min(1),
  readMinutes: z.coerce.number().int().min(1).max(120),
  viewCount: z.coerce.number().int().min(0).default(0),
  coverAlt: z.string().min(1),
  relatedProductSlugs: z.array(z.string().min(1)).default([]),
  relatedPostSlugs: z.array(z.string().min(1)).default([]),
  sections: z.array(blogSectionSchema).min(1),
});

export const adminEditorialBlogEntrySchema = z.object({
  contentType: z.literal('blog').optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable().optional(),
  locale: z.string().min(2).default('en'),
  status: z.enum(editorialEntryStatuses).default('draft'),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  payload: editorialBlogPayloadSchema,
});

export const adminEditorialPressEntrySchema = z.object({
  contentType: z.literal('press').optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable().optional(),
  locale: z.string().min(2).default('en'),
  status: z.enum(editorialEntryStatuses).default('draft'),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  payload: editorialPressPayloadSchema,
});

export const adminEditorialBlogEntryPatchSchema = adminEditorialBlogEntrySchema.partial();
export const adminEditorialPressEntryPatchSchema = adminEditorialPressEntrySchema.partial();

type BlogEntryCreateInput = z.infer<typeof adminEditorialBlogEntrySchema>;
type BlogEntryPatchInput = z.infer<typeof adminEditorialBlogEntryPatchSchema>;
type PressEntryCreateInput = z.infer<typeof adminEditorialPressEntrySchema>;
type PressEntryPatchInput = z.infer<typeof adminEditorialPressEntryPatchSchema>;

export type BlogSeedImportResult = {
  dryRun: boolean;
  totalSeededCount: number;
  candidateCount: number;
  skippedCount: number;
  importedCount: number;
  items: BlogSeedImportItem[];
};

export type BlogSeedImportItem = {
  title: string;
  slug: string;
  locale: string;
  publishedAt: string;
  status: 'candidate' | 'skipped' | 'imported';
  reason: string;
  entryId: string | null;
};

export type PressSeedImportResult = {
  dryRun: boolean;
  totalSeededCount: number;
  candidateCount: number;
  skippedCount: number;
  importedCount: number;
  items: BlogSeedImportItem[];
};

declare global {
  var __vexmotorEditorialContentEntriesStore__: AdminEditorialBlogEntry[] | undefined;
  var __vexmotorEditorialPressEntriesStore__: AdminEditorialPressEntry[] | undefined;
}

type EditorialSortableEntry = {
  title: string;
  publishedAt: string | null;
  updatedAt: string;
};

function cloneEntry<T extends AdminEditorialBlogEntry | AdminEditorialPressEntry>(entry: T): T {
  return JSON.parse(JSON.stringify(entry)) as T;
}

function getMemoryEntriesStore() {
  globalThis.__vexmotorEditorialContentEntriesStore__ ??= [];
  return globalThis.__vexmotorEditorialContentEntriesStore__;
}

function getMemoryPressEntriesStore() {
  globalThis.__vexmotorEditorialPressEntriesStore__ ??= [];
  return globalThis.__vexmotorEditorialPressEntriesStore__;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || 'en';
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseSeedPublishedAt(value: string) {
  const normalized = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parsePressSeedPublishedAt(value: string) {
  const date = new Date(`${value} 01 00:00:00 UTC`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function createBlogEntryInputFromSeed(post: BlogPost): BlogEntryCreateInput {
  return {
    contentType: 'blog',
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    locale: 'en',
    status: 'published',
    seoTitle: post.title,
    seoDescription: post.summary,
    publishedAt: parseSeedPublishedAt(post.publishedAt),
    payload: {
      lead: post.lead,
      category: post.category,
      productTopics: [...post.productTopics],
      industry: post.industry,
      authorId: post.authorId,
      readMinutes: post.readMinutes,
      viewCount: post.viewCount,
      coverAlt: post.coverAlt,
      relatedProductSlugs: [...post.relatedProductSlugs],
      relatedPostSlugs: [...post.relatedPostSlugs],
      sections: post.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => {
          if (block.type === 'paragraph') {
            return { ...block };
          }

          if (block.type === 'list') {
            return { ...block, items: [...block.items] };
          }

          if (block.type === 'table') {
            return {
              ...block,
              columns: [...block.columns],
              rows: block.rows.map((row) => [...row]),
            };
          }

          return { ...block };
        }),
      })),
    },
  };
}

function createPressEntryInputFromSeed(release: PressRelease): PressEntryCreateInput {
  return {
    contentType: 'press',
    title: release.title,
    slug: release.slug,
    summary: release.summary,
    locale: 'en',
    status: 'published',
    seoTitle: release.title,
    seoDescription: release.summary,
    publishedAt: parsePressSeedPublishedAt(release.dateLabel),
    payload: {
      category: release.category,
    },
  };
}

function normalizeBlogPayload(payload: EditorialBlogEntryPayload): EditorialBlogEntryPayload {
  return {
    lead: payload.lead.trim(),
    category: payload.category,
    productTopics: [...payload.productTopics],
    industry: payload.industry,
    authorId: payload.authorId.trim(),
    readMinutes: payload.readMinutes,
    viewCount: payload.viewCount,
    coverAlt: payload.coverAlt.trim(),
    relatedProductSlugs: payload.relatedProductSlugs.map((value) => normalizeSlug(value)),
    relatedPostSlugs: payload.relatedPostSlugs.map((value) => normalizeSlug(value)),
    sections: payload.sections.map((section) => ({
      id: section.id.trim(),
      title: section.title.trim(),
      blocks: section.blocks.map((block) => {
        if (block.type === 'paragraph') {
          return { ...block, text: block.text.trim() };
        }

        if (block.type === 'list') {
          return { ...block, items: block.items.map((item) => item.trim()).filter(Boolean) };
        }

        if (block.type === 'code') {
          return { ...block, language: block.language.trim(), code: block.code };
        }

        if (block.type === 'table') {
          return {
            ...block,
            caption: block.caption.trim(),
            columns: block.columns.map((item) => item.trim()),
            rows: block.rows.map((row) => row.map((item) => item.trim())),
          };
        }

        return {
          ...block,
          productSlug: normalizeSlug(block.productSlug),
          eyebrow: block.eyebrow.trim(),
          body: block.body.trim(),
        };
      }),
    })),
  };
}

function normalizePressPayload(payload: EditorialPressEntryPayload): EditorialPressEntryPayload {
  return {
    category: payload.category.trim(),
  };
}

function sanitizeBlogEntryInput(input: BlogEntryCreateInput) {
  const normalizedTitle = input.title.trim();
  const normalizedSummary = normalizeText(input.summary);
  const normalizedPayload = normalizeBlogPayload(input.payload);
  const normalizedPublishedAt = input.status === 'published'
    ? normalizeDateValue(input.publishedAt) ?? new Date().toISOString()
    : normalizeDateValue(input.publishedAt);

  return {
    contentType: 'blog' as const,
    title: normalizedTitle,
    slug: normalizeSlug(input.slug),
    summary: normalizedSummary,
    locale: normalizeLocale(input.locale),
    status: input.status,
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedTitle, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? normalizedSummary ?? normalizedPayload.lead, 160),
    publishedAt: normalizedPublishedAt,
    payload: normalizedPayload,
  };
}

function sanitizePressEntryInput(input: PressEntryCreateInput) {
  const normalizedTitle = input.title.trim();
  const normalizedSummary = normalizeText(input.summary);
  const normalizedPayload = normalizePressPayload(input.payload);
  const normalizedPublishedAt = input.status === 'published'
    ? normalizeDateValue(input.publishedAt) ?? new Date().toISOString()
    : normalizeDateValue(input.publishedAt);

  return {
    contentType: 'press' as const,
    title: normalizedTitle,
    slug: normalizeSlug(input.slug || createPressReleaseSlug(normalizedTitle)),
    summary: normalizedSummary,
    locale: normalizeLocale(input.locale),
    status: input.status,
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedTitle, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? normalizedSummary ?? normalizedPayload.category, 160),
    publishedAt: normalizedPublishedAt,
    payload: normalizedPayload,
  };
}

function sortEntries<T extends EditorialSortableEntry>(left: T, right: T) {
  const leftTimestamp = Date.parse(left.publishedAt ?? left.updatedAt);
  const rightTimestamp = Date.parse(right.publishedAt ?? right.updatedAt);

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return left.title.localeCompare(right.title);
}

function normalizeRecord(record: typeof editorialContentEntries.$inferSelect): AdminEditorialBlogEntry | null {
  if (record.contentType !== 'blog') {
    return null;
  }

  const payload = editorialBlogPayloadSchema.safeParse(record.payload);
  if (!payload.success) {
    return null;
  }

  return {
    id: record.id,
    contentType: 'blog',
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    locale: record.locale,
    status: record.status,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    payload: normalizeBlogPayload(payload.data),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function normalizePressRecord(record: typeof editorialContentEntries.$inferSelect): AdminEditorialPressEntry | null {
  if (record.contentType !== 'press') {
    return null;
  }

  const payload = editorialPressPayloadSchema.safeParse(record.payload);
  if (!payload.success) {
    return null;
  }

  return {
    id: record.id,
    contentType: 'press',
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    locale: record.locale,
    status: record.status,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    payload: normalizePressPayload(payload.data),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function filterEntries(entries: AdminEditorialBlogEntry[], search?: string) {
  const normalizedSearch = search?.trim().toLowerCase();

  const filtered = normalizedSearch
    ? entries.filter((entry) => [entry.title, entry.slug, entry.summary ?? '', entry.seoTitle ?? '', entry.seoDescription ?? '', entry.payload.lead].join(' ').toLowerCase().includes(normalizedSearch))
    : entries;

  return filtered.sort(sortEntries).map(cloneEntry);
}

function filterPressEntries(entries: AdminEditorialPressEntry[], search?: string) {
  const normalizedSearch = search?.trim().toLowerCase();

  const filtered = normalizedSearch
    ? entries.filter((entry) => [entry.title, entry.slug, entry.summary ?? '', entry.seoTitle ?? '', entry.seoDescription ?? '', entry.payload.category].join(' ').toLowerCase().includes(normalizedSearch))
    : entries;

  return filtered.sort(sortEntries).map(cloneEntry);
}

export async function getAdminEditorialBlogEntries(search?: string): Promise<AdminEditorialBlogEntry[]> {
  if (!db) {
    return filterEntries(getMemoryEntriesStore(), search);
  }

  try {
    const rows = await db
      .select()
      .from(editorialContentEntries)
      .where(eq(editorialContentEntries.contentType, 'blog'))
      .orderBy(desc(editorialContentEntries.updatedAt), asc(editorialContentEntries.title));

    return filterEntries(rows.map(normalizeRecord).filter((entry): entry is AdminEditorialBlogEntry => Boolean(entry)), search);
  } catch {
    return filterEntries(getMemoryEntriesStore(), search);
  }
}

export async function getAdminEditorialBlogEntry(id: string) {
  const entries = await getAdminEditorialBlogEntries();
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function findAdminEditorialBlogEntryBySlug(slug: string, locale?: string, excludeId?: string) {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedLocale = normalizeLocale(locale);
  const entries = await getAdminEditorialBlogEntries();

  return entries.find(
    (entry) => entry.slug === normalizedSlug && entry.locale === normalizedLocale && entry.id !== excludeId,
  ) ?? null;
}

export async function createAdminEditorialBlogEntry(input: BlogEntryCreateInput) {
  const next = sanitizeBlogEntryInput(input);
  const timestamp = new Date().toISOString();

  if (!db) {
    const created: AdminEditorialBlogEntry = {
      id: randomUUID(),
      ...next,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    getMemoryEntriesStore().unshift(created);
    return cloneEntry(created);
  }

  try {
    const [created] = await db
      .insert(editorialContentEntries)
      .values({
        contentType: 'blog',
        title: next.title,
        slug: next.slug,
        summary: next.summary,
        locale: next.locale,
        status: next.status,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
        payload: next.payload,
      })
      .returning();

    return created ? normalizeRecord(created) : null;
  } catch {
    const created: AdminEditorialBlogEntry = {
      id: randomUUID(),
      ...next,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    getMemoryEntriesStore().unshift(created);
    return cloneEntry(created);
  }
}

export async function updateAdminEditorialBlogEntry(id: string, input: BlogEntryPatchInput) {
  const current = await getAdminEditorialBlogEntry(id);
  if (!current) {
    return null;
  }

  const next = sanitizeBlogEntryInput({
    title: input.title ?? current.title,
    slug: input.slug ?? current.slug,
    summary: input.summary === undefined ? current.summary : input.summary,
    locale: input.locale ?? current.locale,
    status: input.status ?? current.status,
    seoTitle: input.seoTitle === undefined ? current.seoTitle : input.seoTitle,
    seoDescription: input.seoDescription === undefined ? current.seoDescription : input.seoDescription,
    publishedAt: input.publishedAt === undefined ? (current.publishedAt ? new Date(current.publishedAt) : null) : input.publishedAt,
    payload: input.payload ?? current.payload,
  });

  if (!db) {
    const store = getMemoryEntriesStore();
    const index = store.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return null;
    }

    const updated: AdminEditorialBlogEntry = {
      ...store[index],
      ...next,
      updatedAt: new Date().toISOString(),
    };

    store[index] = updated;
    return cloneEntry(updated);
  }

  try {
    const [updated] = await db
      .update(editorialContentEntries)
      .set({
        title: next.title,
        slug: next.slug,
        summary: next.summary,
        locale: next.locale,
        status: next.status,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
        payload: next.payload,
        updatedAt: new Date(),
      })
      .where(eq(editorialContentEntries.id, id))
      .returning();

    return updated ? normalizeRecord(updated) : null;
  } catch {
    const store = getMemoryEntriesStore();
    const index = store.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return null;
    }

    const updated: AdminEditorialBlogEntry = {
      ...store[index],
      ...next,
      updatedAt: new Date().toISOString(),
    };

    store[index] = updated;
    return cloneEntry(updated);
  }
}

export async function deleteAdminEditorialBlogEntry(id: string) {
  if (!db) {
    const store = getMemoryEntriesStore();
    const nextStore = store.filter((entry) => entry.id !== id);
    if (nextStore.length === store.length) {
      return false;
    }

    globalThis.__vexmotorEditorialContentEntriesStore__ = nextStore;
    return true;
  }

  try {
    const [deleted] = await db
      .delete(editorialContentEntries)
      .where(eq(editorialContentEntries.id, id))
      .returning({ id: editorialContentEntries.id });

    return Boolean(deleted);
  } catch {
    const store = getMemoryEntriesStore();
    const nextStore = store.filter((entry) => entry.id !== id);
    if (nextStore.length === store.length) {
      return false;
    }

    globalThis.__vexmotorEditorialContentEntriesStore__ = nextStore;
    return true;
  }
}

export async function getPublishedAdminEditorialBlogEntries(locale = 'en') {
  const normalizedLocale = normalizeLocale(locale);
  const entries = await getAdminEditorialBlogEntries();

  return entries.filter((entry) => entry.status === 'published' && entry.locale === normalizedLocale).sort(sortEntries);
}

export async function importSeededBlogPosts(options?: { dryRun?: boolean }): Promise<BlogSeedImportResult> {
  const dryRun = options?.dryRun === true;
  const existingEntries = await getAdminEditorialBlogEntries();
  const existingEntriesByKey = new Map(existingEntries.map((entry) => [`${entry.locale}::${entry.slug}`, entry]));
  const reportItems: BlogSeedImportItem[] = blogPosts.map((post) => {
    const key = `en-US::${normalizeSlug(post.slug)}`;
    const existingEntry = existingEntriesByKey.get(key);

    return {
      title: post.title,
      slug: normalizeSlug(post.slug),
      locale: 'en',
      publishedAt: parseSeedPublishedAt(post.publishedAt).toISOString(),
      status: existingEntry ? 'skipped' : 'candidate',
      reason: existingEntry ? '该 slug 已存在后台内容资产，保持后台版本优先。' : '可导入为后台已发布 Blog 文章。',
      entryId: existingEntry?.id ?? null,
    };
  });
  const candidates = blogPosts.filter((post) => !existingEntriesByKey.has(`en-US::${normalizeSlug(post.slug)}`));

  if (dryRun) {
    return {
      dryRun: true,
      totalSeededCount: blogPosts.length,
      candidateCount: candidates.length,
      skippedCount: blogPosts.length - candidates.length,
      importedCount: 0,
      items: reportItems,
    };
  }

  const createdEntries: AdminEditorialBlogEntry[] = [];
  const importedReportItems: BlogSeedImportItem[] = [];

  for (const candidate of candidates) {
    const created = await createAdminEditorialBlogEntry(createBlogEntryInputFromSeed(candidate));
    if (created) {
      createdEntries.push(created);
      importedReportItems.push({
        title: created.title,
        slug: created.slug,
        locale: created.locale,
        publishedAt: created.publishedAt ?? created.updatedAt,
        status: 'imported',
        reason: '已导入后台内容资产并保持已发布状态。',
        entryId: created.id,
      });
    }
  }

  const skippedReportItems = reportItems.filter((item) => item.status === 'skipped');

  return {
    dryRun: false,
    totalSeededCount: blogPosts.length,
    candidateCount: candidates.length,
    skippedCount: blogPosts.length - candidates.length,
    importedCount: createdEntries.length,
    items: [...importedReportItems, ...skippedReportItems],
  };
}

export async function getAdminEditorialPressEntries(search?: string): Promise<AdminEditorialPressEntry[]> {
  if (!db) {
    return filterPressEntries(getMemoryPressEntriesStore(), search);
  }

  try {
    const rows = await db
      .select()
      .from(editorialContentEntries)
      .where(eq(editorialContentEntries.contentType, 'press'))
      .orderBy(desc(editorialContentEntries.updatedAt), asc(editorialContentEntries.title));

    return filterPressEntries(rows.map(normalizePressRecord).filter((entry): entry is AdminEditorialPressEntry => Boolean(entry)), search);
  } catch {
    return filterPressEntries(getMemoryPressEntriesStore(), search);
  }
}

export async function createAdminEditorialPressEntry(input: PressEntryCreateInput) {
  const next = sanitizePressEntryInput(input);
  const timestamp = new Date().toISOString();

  if (!db) {
    const created: AdminEditorialPressEntry = {
      id: randomUUID(),
      ...next,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    getMemoryPressEntriesStore().unshift(created);
    return cloneEntry(created);
  }

  try {
    const [created] = await db
      .insert(editorialContentEntries)
      .values({
        contentType: 'press',
        title: next.title,
        slug: next.slug,
        summary: next.summary,
        locale: next.locale,
        status: next.status,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
        payload: next.payload,
      })
      .returning();

    return created ? normalizePressRecord(created) : null;
  } catch {
    const created: AdminEditorialPressEntry = {
      id: randomUUID(),
      ...next,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    getMemoryPressEntriesStore().unshift(created);
    return cloneEntry(created);
  }
}

export async function getAdminEditorialPressEntry(id: string) {
  const entries = await getAdminEditorialPressEntries();
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function findAdminEditorialPressEntryBySlug(slug: string, locale?: string, excludeId?: string) {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedLocale = normalizeLocale(locale);
  const entries = await getAdminEditorialPressEntries();

  return entries.find(
    (entry) => entry.slug === normalizedSlug && entry.locale === normalizedLocale && entry.id !== excludeId,
  ) ?? null;
}

export async function updateAdminEditorialPressEntry(id: string, input: PressEntryPatchInput) {
  const current = await getAdminEditorialPressEntry(id);
  if (!current) {
    return null;
  }

  const next = sanitizePressEntryInput({
    contentType: 'press',
    title: input.title ?? current.title,
    slug: input.slug ?? current.slug,
    summary: input.summary === undefined ? current.summary : input.summary,
    locale: input.locale ?? current.locale,
    status: input.status ?? current.status,
    seoTitle: input.seoTitle === undefined ? current.seoTitle : input.seoTitle,
    seoDescription: input.seoDescription === undefined ? current.seoDescription : input.seoDescription,
    publishedAt: input.publishedAt === undefined ? (current.publishedAt ? new Date(current.publishedAt) : null) : input.publishedAt,
    payload: input.payload ?? current.payload,
  });

  if (!db) {
    const store = getMemoryPressEntriesStore();
    const index = store.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return null;
    }

    const updated: AdminEditorialPressEntry = {
      ...store[index],
      ...next,
      updatedAt: new Date().toISOString(),
    };

    store[index] = updated;
    return cloneEntry(updated);
  }

  try {
    const [updated] = await db
      .update(editorialContentEntries)
      .set({
        title: next.title,
        slug: next.slug,
        summary: next.summary,
        locale: next.locale,
        status: next.status,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
        payload: next.payload,
        updatedAt: new Date(),
      })
      .where(eq(editorialContentEntries.id, id))
      .returning();

    return updated ? normalizePressRecord(updated) : null;
  } catch {
    const store = getMemoryPressEntriesStore();
    const index = store.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return null;
    }

    const updated: AdminEditorialPressEntry = {
      ...store[index],
      ...next,
      updatedAt: new Date().toISOString(),
    };

    store[index] = updated;
    return cloneEntry(updated);
  }
}

export async function deleteAdminEditorialPressEntry(id: string) {
  if (!db) {
    const store = getMemoryPressEntriesStore();
    const nextStore = store.filter((entry) => entry.id !== id);
    if (nextStore.length === store.length) {
      return false;
    }

    globalThis.__vexmotorEditorialPressEntriesStore__ = nextStore;
    return true;
  }

  try {
    const [deleted] = await db
      .delete(editorialContentEntries)
      .where(eq(editorialContentEntries.id, id))
      .returning({ id: editorialContentEntries.id });

    return Boolean(deleted);
  } catch {
    const store = getMemoryPressEntriesStore();
    const nextStore = store.filter((entry) => entry.id !== id);
    if (nextStore.length === store.length) {
      return false;
    }

    globalThis.__vexmotorEditorialPressEntriesStore__ = nextStore;
    return true;
  }
}

export async function getPublishedAdminEditorialPressEntries(locale = 'en') {
  const normalizedLocale = normalizeLocale(locale);
  const entries = await getAdminEditorialPressEntries();

  return entries.filter((entry) => entry.status === 'published' && entry.locale === normalizedLocale).sort(sortEntries);
}

export async function importSeededPressReleases(options?: { dryRun?: boolean }): Promise<PressSeedImportResult> {
  const dryRun = options?.dryRun === true;
  const existingEntries = await getAdminEditorialPressEntries();
  const existingEntriesByKey = new Map(existingEntries.map((entry) => [`${entry.locale}::${entry.slug}`, entry]));
  const reportItems: BlogSeedImportItem[] = pressReleases.map((release) => {
    const key = `en-US::${normalizeSlug(release.slug)}`;
    const existingEntry = existingEntriesByKey.get(key);
    const publishedAt = parsePressSeedPublishedAt(release.dateLabel).toISOString();

    return {
      title: release.title,
      slug: normalizeSlug(release.slug),
      locale: 'en',
      publishedAt,
      status: existingEntry ? 'skipped' : 'candidate',
      reason: existingEntry ? '该 slug 已存在后台 Press 资产，保持后台版本优先。' : '可导入为后台已发布新闻稿。',
      entryId: existingEntry?.id ?? null,
    };
  });
  const candidates = pressReleases.filter((release) => !existingEntriesByKey.has(`en-US::${normalizeSlug(release.slug)}`));

  if (dryRun) {
    return {
      dryRun: true,
      totalSeededCount: pressReleases.length,
      candidateCount: candidates.length,
      skippedCount: pressReleases.length - candidates.length,
      importedCount: 0,
      items: reportItems,
    };
  }

  const createdEntries: AdminEditorialPressEntry[] = [];
  const importedReportItems: BlogSeedImportItem[] = [];

  for (const candidate of candidates) {
    const created = await createAdminEditorialPressEntry(createPressEntryInputFromSeed(candidate));
    if (created) {
      createdEntries.push(created);
      importedReportItems.push({
        title: created.title,
        slug: created.slug,
        locale: created.locale,
        publishedAt: created.publishedAt ?? created.updatedAt,
        status: 'imported',
        reason: '已导入后台 Press 资产并保持已发布状态。',
        entryId: created.id,
      });
    }
  }

  const skippedReportItems = reportItems.filter((item) => item.status === 'skipped');

  return {
    dryRun: false,
    totalSeededCount: pressReleases.length,
    candidateCount: candidates.length,
    skippedCount: pressReleases.length - candidates.length,
    importedCount: createdEntries.length,
    items: [...importedReportItems, ...skippedReportItems],
  };
}