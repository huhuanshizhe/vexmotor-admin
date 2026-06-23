import 'server-only';

import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialContentPayload,
  editorialEntryStatuses,
} from '@/lib/editorial-content';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { db } from '@/server/db';
import { editorialContentTranslations, editorialContents } from '@/server/db/schema';

const payloadSchema = z.object({
  body: z.string().trim().refine(hasMeaningfulHtmlBody, { message: 'Body is required' }),
  coverUrl: z.string().trim().nullable().optional().transform((value) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }).refine((value) => !value || /^https?:\/\//i.test(value), { message: 'Invalid cover URL' }),
  coverAlt: z.string().trim().nullable().optional().transform((value) => value || null),
  tags: z.array(z.string().trim().min(1)).default([]),
  relatedProductSlugs: z.array(z.string().trim().min(1)).default([]),
});

export const adminEditorialContentTranslationSchema = z.object({
  contentId: z.string().uuid().optional(),
  contentType: z.literal('content').optional(),
  boardKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  summary: z.string().trim().nullable().optional(),
  locale: z.string().trim().min(2).default('en'),
  status: z.enum(editorialEntryStatuses).default('draft'),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  payload: payloadSchema,
});

export const adminEditorialContentTranslationPatchSchema = adminEditorialContentTranslationSchema.partial();

export const adminEditorialContentPatchSchema = z.object({
  boardKey: z.string().trim().min(1).optional(),
  status: z.enum(editorialEntryStatuses).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});

/** @deprecated */
export const adminEditorialContentEntrySchema = adminEditorialContentTranslationSchema.extend({
  translationGroupId: z.string().uuid().optional(),
}).transform((value) => ({
  ...value,
  contentId: value.contentId ?? value.translationGroupId,
}));

/** @deprecated */
export const adminEditorialContentEntryPatchSchema = adminEditorialContentTranslationPatchSchema;

type TranslationCreateInput = z.infer<typeof adminEditorialContentTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminEditorialContentTranslationPatchSchema>;
type ContentPatchInput = z.infer<typeof adminEditorialContentPatchSchema>;

type ContentRow = typeof editorialContents.$inferSelect;
type TranslationRow = typeof editorialContentTranslations.$inferSelect;

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || 'en';
}

function normalizeBoardKey(value: string | null | undefined) {
  return normalizeSlug(value || 'content') || 'content';
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePayload(payload: EditorialContentPayload): EditorialContentPayload {
  return {
    body: payload.body.trim(),
    coverUrl: normalizeText(payload.coverUrl),
    coverAlt: normalizeText(payload.coverAlt),
    tags: payload.tags.map((value) => value.trim()).filter(Boolean),
    relatedProductSlugs: payload.relatedProductSlugs.map(normalizeSlug).filter(Boolean),
  };
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const normalizedTitle = input.title.trim();
  const normalizedSummary = normalizeText(input.summary);
  const normalizedPayload = normalizePayload(input.payload);

  return {
    boardKey: normalizeBoardKey(input.boardKey),
    title: normalizedTitle,
    slug: normalizeSlug(input.slug),
    summary: normalizedSummary,
    locale: normalizeLocale(input.locale),
    status: input.status,
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedTitle, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? normalizedSummary ?? normalizedPayload.body, 160),
    publishedAt: input.status === 'published'
      ? normalizeDateValue(input.publishedAt) ?? new Date().toISOString()
      : normalizeDateValue(input.publishedAt),
    payload: normalizedPayload,
  };
}

function normalizeTranslationRow(content: ContentRow, translation: TranslationRow): AdminEditorialContentTranslation | null {
  if (content.contentType !== 'content' || translation.contentType !== 'content') return null;
  const payload = payloadSchema.safeParse({
    ...translation.payload,
    coverUrl: translation.payload?.coverUrl ?? null,
  });
  if (!payload.success) return null;

  return {
    id: translation.id,
    contentId: content.id,
    contentType: 'content',
    boardKey: normalizeBoardKey(content.boardKey),
    locale: translation.locale,
    title: translation.title,
    slug: translation.slug,
    summary: translation.summary,
    status: content.status,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    payload: normalizePayload(payload.data),
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(content.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : content.updatedAt.toISOString(),
  };
}

function pickPrimaryTranslation(translations: TranslationRow[]) {
  if (!translations.length) return null;
  const sorted = [...translations].sort((left, right) => {
    const leftPriority = left.locale.toLowerCase().startsWith('en') ? 0 : 1;
    const rightPriority = right.locale.toLowerCase().startsWith('en') ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function toListItem(content: ContentRow, translations: TranslationRow[]): AdminEditorialContentListItem | null {
  if (content.contentType !== 'content') return null;
  const primary = pickPrimaryTranslation(translations);
  if (!primary) return null;

  return {
    id: content.id,
    contentType: 'content',
    boardKey: normalizeBoardKey(content.boardKey),
    status: content.status,
    title: primary.title,
    slug: primary.slug,
    summary: primary.summary,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    publishedAt: content.publishedAt?.toISOString() ?? null,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
  };
}

function sortListItems(left: AdminEditorialContentListItem, right: AdminEditorialContentListItem) {
  const leftTimestamp = Date.parse(left.publishedAt ?? left.updatedAt);
  const rightTimestamp = Date.parse(right.publishedAt ?? right.updatedAt);
  if (leftTimestamp !== rightTimestamp) return rightTimestamp - leftTimestamp;
  return left.title.localeCompare(right.title);
}

async function loadTranslationsByContentIds(contentIds: string[]) {
  if (!contentIds.length) return new Map<string, TranslationRow[]>();

  const rows = await db
    .select()
    .from(editorialContentTranslations)
    .where(inArray(editorialContentTranslations.contentId, contentIds))
    .orderBy(asc(editorialContentTranslations.locale));

  const grouped = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.contentId) ?? [];
    bucket.push(row);
    grouped.set(row.contentId, bucket);
  }
  return grouped;
}

async function findContentIdsBySearch(search: string) {
  const pattern = `%${search.trim()}%`;
  const rows = await db
    .selectDistinct({ contentId: editorialContentTranslations.contentId })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(
      eq(editorialContents.contentType, 'content'),
      or(
        ilike(editorialContentTranslations.title, pattern),
        ilike(editorialContentTranslations.slug, pattern),
        ilike(editorialContentTranslations.summary, pattern),
        ilike(editorialContentTranslations.seoTitle, pattern),
        ilike(editorialContentTranslations.seoDescription, pattern),
        sql`${editorialContentTranslations.payload} ->> 'body' ILIKE ${pattern}`,
      ),
    ));

  return rows.map((row) => row.contentId);
}

export async function getAdminEditorialContentList(search?: string): Promise<AdminEditorialContentListItem[]> {
  const matchingIds = search?.trim() ? await findContentIdsBySearch(search) : null;

  const contentRows = matchingIds
    ? matchingIds.length
      ? await db
        .select()
        .from(editorialContents)
        .where(and(
          eq(editorialContents.contentType, 'content'),
          inArray(editorialContents.id, matchingIds),
        ))
        .orderBy(desc(editorialContents.updatedAt))
      : []
    : await db
      .select()
      .from(editorialContents)
      .where(eq(editorialContents.contentType, 'content'))
      .orderBy(desc(editorialContents.updatedAt));

  const translationMap = await loadTranslationsByContentIds(contentRows.map((row) => row.id));

  return contentRows
    .map((content) => toListItem(content, translationMap.get(content.id) ?? []))
    .filter((item): item is AdminEditorialContentListItem => Boolean(item))
    .sort(sortListItems);
}

/** @deprecated 使用 getAdminEditorialContentList */
export async function getAdminEditorialContentEntries(search?: string) {
  return getAdminEditorialContentList(search);
}

export async function getAdminEditorialContentListItem(contentId: string) {
  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, contentId))
    .limit(1);

  if (!content) return null;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId))
    .orderBy(asc(editorialContentTranslations.locale));

  return toListItem(content, translations);
}

export async function getAdminEditorialContentTranslations(contentId: string) {
  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, contentId))
    .limit(1);

  if (!content) return [];

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId))
    .orderBy(asc(editorialContentTranslations.locale));

  return translations
    .map((translation) => normalizeTranslationRow(content, translation))
    .filter((item): item is AdminEditorialContentTranslation => Boolean(item));
}

/** @deprecated */
export async function getAdminEditorialContentEntriesByGroup(groupId: string) {
  return getAdminEditorialContentTranslations(groupId);
}

export async function getAdminEditorialContentTranslation(translationId: string) {
  const [row] = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(eq(editorialContentTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.content, row.translation) : null;
}

/** @deprecated */
export async function getAdminEditorialContentEntry(id: string) {
  return getAdminEditorialContentTranslation(id);
}

export async function findAdminEditorialContentTranslationBySlug(slug: string, locale?: string, excludeTranslationId?: string) {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedLocale = normalizeLocale(locale);

  const conditions = [
    eq(editorialContentTranslations.contentType, 'content'),
    eq(editorialContentTranslations.slug, normalizedSlug),
    eq(editorialContentTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(editorialContentTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.content, row.translation) : null;
}

/** @deprecated */
export async function findAdminEditorialContentEntryBySlug(slug: string, locale?: string, excludeId?: string) {
  return findAdminEditorialContentTranslationBySlug(slug, locale, excludeId);
}

export async function findAdminEditorialContentTranslationByContentAndLocale(contentId: string, locale: string, excludeTranslationId?: string) {
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(editorialContentTranslations.contentId, contentId),
    eq(editorialContentTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(editorialContentTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.content, row.translation) : null;
}

/** @deprecated */
export async function findAdminEditorialContentEntryByGroupAndLocale(groupId: string, locale: string, excludeId?: string) {
  return findAdminEditorialContentTranslationByContentAndLocale(groupId, locale, excludeId);
}

export async function createAdminEditorialContentTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  const contentId = input.contentId
    ? input.contentId
    : (await db
      .insert(editorialContents)
      .values({
        contentType: 'content',
        boardKey: next.boardKey,
        status: next.status,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
      })
      .returning({ id: editorialContents.id }))[0]?.id;

  if (!contentId) return null;

  if (input.contentId) {
    await db
      .update(editorialContents)
      .set({
        boardKey: next.boardKey,
        status: next.status,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(editorialContents.id, contentId));
  }

  const [created] = await db
    .insert(editorialContentTranslations)
    .values({
      contentId,
      contentType: 'content',
      locale: next.locale,
      title: next.title,
      slug: next.slug,
      summary: next.summary,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      payload: next.payload,
    })
    .returning();

  if (!created) return null;

  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, contentId))
    .limit(1);

  return content ? normalizeTranslationRow(content, created) : null;
}

/** @deprecated */
export async function createAdminEditorialContentEntry(input: TranslationCreateInput & { translationGroupId?: string }) {
  return createAdminEditorialContentTranslation({
    ...input,
    contentId: input.contentId ?? input.translationGroupId,
  });
}

export async function updateAdminEditorialContentTranslation(translationId: string, input: TranslationPatchInput) {
  const current = await getAdminEditorialContentTranslation(translationId);
  if (!current) return null;

  const merged = sanitizeTranslationInput({
    contentId: current.contentId,
    boardKey: input.boardKey ?? current.boardKey,
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

  await db
    .update(editorialContents)
    .set({
      boardKey: merged.boardKey,
      status: merged.status,
      publishedAt: merged.publishedAt ? new Date(merged.publishedAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(editorialContents.id, current.contentId));

  const [updated] = await db
    .update(editorialContentTranslations)
    .set({
      locale: merged.locale,
      title: merged.title,
      slug: merged.slug,
      summary: merged.summary,
      seoTitle: merged.seoTitle,
      seoDescription: merged.seoDescription,
      payload: merged.payload,
      updatedAt: new Date(),
    })
    .where(eq(editorialContentTranslations.id, translationId))
    .returning();

  if (!updated) return null;

  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, current.contentId))
    .limit(1);

  return content ? normalizeTranslationRow(content, updated) : null;
}

/** @deprecated */
export async function updateAdminEditorialContentEntry(id: string, input: TranslationPatchInput) {
  return updateAdminEditorialContentTranslation(id, input);
}

export async function updateAdminEditorialContent(contentId: string, input: ContentPatchInput) {
  const current = await getAdminEditorialContentListItem(contentId);
  if (!current) return null;

  const nextStatus = input.status ?? current.status;
  const nextPublishedAt = input.publishedAt === undefined
    ? current.publishedAt
    : normalizeDateValue(input.publishedAt);

  const [updated] = await db
    .update(editorialContents)
    .set({
      boardKey: input.boardKey ? normalizeBoardKey(input.boardKey) : current.boardKey,
      status: nextStatus,
      publishedAt: nextStatus === 'published'
        ? new Date(nextPublishedAt ?? new Date().toISOString())
        : nextPublishedAt
          ? new Date(nextPublishedAt)
          : null,
      updatedAt: new Date(),
    })
    .where(eq(editorialContents.id, contentId))
    .returning();

  if (!updated) return null;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId));

  return toListItem(updated, translations);
}

export async function deleteAdminEditorialContent(contentId: string) {
  const [deleted] = await db
    .delete(editorialContents)
    .where(eq(editorialContents.id, contentId))
    .returning({ id: editorialContents.id });

  return Boolean(deleted);
}

/** @deprecated 删除整条内容请使用 deleteAdminEditorialContent */
export async function deleteAdminEditorialContentEntry(id: string) {
  const translation = await getAdminEditorialContentTranslation(id);
  if (!translation) return false;
  return deleteAdminEditorialContent(translation.contentId);
}
