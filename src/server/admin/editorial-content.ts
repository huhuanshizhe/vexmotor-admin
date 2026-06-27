import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, ne, notInArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import {
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialContentModule,
  type EditorialContentPayload,
  defaultEditorialPayloadMeta,
  editorialContentModules,
  editorialEntryStatuses,
  resolveContentModuleByBoard,
} from '@/lib/editorial-content';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { extractSummaryFromHtmlBody } from '@/lib/editorial-summary';
import { db } from '@/server/db';
import { editorialContentBoards, editorialContentTranslations, editorialContents } from '@/server/db/schema';

const payloadSchema = z.object({
  body: z.string().trim().refine(hasMeaningfulHtmlBody, { message: 'Body is required' }),
  coverStyle: z.number().int().min(1).max(10).nullable().optional().transform((value) => value ?? null),
  tags: z.array(z.string().trim().min(1)).default([]),
  relatedProductSlugs: z.array(z.string().trim().min(1)).default([]),
  authorName: z.string().trim().nullable().optional().transform((value) => value?.trim() || null),
  authorTitle: z.string().trim().nullable().optional().transform((value) => value?.trim() || null),
  authorBio: z.string().trim().nullable().optional().transform((value) => value?.trim() || null),
  category: z.string().trim().nullable().optional().transform((value) => value?.trim() || null),
});

const adminEditorialContentTranslationBaseSchema = z.object({
  contentId: z.string().uuid().optional(),
  contentType: z.literal('content').optional(),
  contentModule: z.enum(editorialContentModules).optional(),
  boardKey: z.string().trim().min(1).optional(),
  boardKeys: z.array(z.string().trim().min(1)).min(1).optional(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  summary: z.string().trim().nullable().optional(),
  locale: z.string().trim().min(2).default('en'),
  status: z.enum(editorialEntryStatuses).default('draft'),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  payload: payloadSchema,
});

export const adminEditorialContentTranslationSchema = adminEditorialContentTranslationBaseSchema.superRefine((data, ctx) => {
  if (!data.boardKeys?.length && !data.boardKey) {
    ctx.addIssue({ code: 'custom', message: 'boardKey or boardKeys is required', path: ['boardKey'] });
  }
});

export const adminEditorialContentTranslationPatchSchema = adminEditorialContentTranslationBaseSchema.partial();

export const adminEditorialContentPatchSchema = z.object({
  boardKey: z.string().trim().min(1).optional(),
  boardKeys: z.array(z.string().trim().min(1)).min(1).optional(),
  status: z.enum(editorialEntryStatuses).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});

/** @deprecated */
export const adminEditorialContentEntrySchema = adminEditorialContentTranslationBaseSchema.extend({
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

import { generateSlugFromText, normalizeSlug, resolveSlugForSave } from '@/lib/slug';
import { normalizeEntityKeyForSave } from '@/lib/admin-entity-key';

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || 'en';
}

function normalizeBoardKey(value: string | null | undefined) {
  return normalizeEntityKeyForSave(value ?? '') ?? 'content';
}

function resolveBoardKeys(input: { boardKeys?: string[]; boardKey?: string | null }) {
  const fromArray = input.boardKeys?.map(normalizeBoardKey).filter(Boolean);
  if (fromArray?.length) return [...new Set(fromArray)];
  if (input.boardKey) return [normalizeBoardKey(input.boardKey)];
  return [] as string[];
}

type SyncContentBoardsResult = { ok: true; boardKeys: string[]; primaryBoardKey: string } | { ok: false; code: string };

async function loadBoardKeysByContentIds(contentIds: string[]) {
  if (!contentIds.length) return new Map<string, string[]>();

  const rows = await db
    .select()
    .from(editorialContentBoards)
    .where(inArray(editorialContentBoards.contentId, contentIds))
    .orderBy(asc(editorialContentBoards.boardKey));

  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.contentId) ?? [];
    bucket.push(normalizeBoardKey(row.boardKey));
    grouped.set(row.contentId, bucket);
  }
  return grouped;
}

async function syncContentBoards(
  contentId: string,
  boardKeysInput: string[],
  options?: { lockedBoardKey?: string; contentModule?: EditorialContentModule },
): Promise<SyncContentBoardsResult> {
  let boardKeys = [...new Set(boardKeysInput.map(normalizeBoardKey).filter(Boolean))];
  const lockedBoardKey = options?.lockedBoardKey ? normalizeBoardKey(options.lockedBoardKey) : null;

  if (lockedBoardKey && !boardKeys.includes(lockedBoardKey)) {
    boardKeys = [lockedBoardKey, ...boardKeys];
  }

  if (boardKeys.length < 1) {
    return { ok: false, code: 'BOARD_KEYS_REQUIRED' };
  }

  const primaryBoardKey = lockedBoardKey ?? boardKeys[0]!;

  await db.transaction(async (tx) => {
    await tx.delete(editorialContentBoards).where(eq(editorialContentBoards.contentId, contentId));
    await tx.insert(editorialContentBoards).values(
      boardKeys.map((boardKey) => ({ contentId, boardKey })),
    );
    await tx
      .update(editorialContents)
      .set({ boardKey: primaryBoardKey, updatedAt: new Date() })
      .where(eq(editorialContents.id, contentId));
  });

  return { ok: true, boardKeys, primaryBoardKey };
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeCoverStyle(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    return null;
  }
  return value;
}

function normalizePayload(payload: EditorialContentPayload): EditorialContentPayload {
  return {
    body: payload.body.trim(),
    coverStyle: normalizeCoverStyle(payload.coverStyle ?? null),
    tags: payload.tags.map((value) => value.trim()).filter(Boolean),
    relatedProductSlugs: payload.relatedProductSlugs.map(normalizeSlug).filter(Boolean),
    authorName: normalizeText(payload.authorName),
    authorTitle: normalizeText(payload.authorTitle),
    authorBio: normalizeText(payload.authorBio),
    category: normalizeText(payload.category),
  };
}

function mergePayload(payload: Partial<EditorialContentPayload> & Pick<EditorialContentPayload, 'body'>): EditorialContentPayload {
  const { body, ...rest } = payload;
  return normalizePayload({
    ...defaultEditorialPayloadMeta,
    ...rest,
    body,
  });
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const normalizedTitle = input.title.trim();
  const normalizedPayload = mergePayload(input.payload);
  const boardKeys = resolveBoardKeys(input);
  const boardKey = boardKeys[0] ?? 'content';
  const contentModule = input.contentModule ?? resolveContentModuleByBoard(boardKey);
  let normalizedSummary = normalizeText(input.summary);
  if (contentModule === 'editorial' && !normalizedSummary) {
    normalizedSummary = normalizeText(extractSummaryFromHtmlBody(normalizedPayload.body));
  }
  const normalizedSlug = resolveSlugForSave({
    sourceText: normalizedTitle,
    slug: input.slug,
  });

  return {
    boardKeys,
    boardKey,
    contentModule,
    title: normalizedTitle,
    slug: normalizedSlug || `item-${Date.now()}`,
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

function normalizeTranslationRow(
  content: ContentRow,
  translation: TranslationRow,
  boardKeys?: string[],
): AdminEditorialContentTranslation | null {
  if (content.contentType !== 'content' || translation.contentType !== 'content') return null;
  const payload = payloadSchema.safeParse(translation.payload ?? {});
  if (!payload.success) return null;

  const resolvedBoardKeys = boardKeys?.length ? boardKeys : [normalizeBoardKey(content.boardKey)];

  return {
    id: translation.id,
    contentId: content.id,
    contentType: 'content',
    boardKey: resolvedBoardKeys[0] ?? normalizeBoardKey(content.boardKey),
    boardKeys: resolvedBoardKeys,
    locale: translation.locale,
    title: translation.title,
    slug: translation.slug,
    summary: translation.summary,
    status: content.status,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    payload: mergePayload(payload.data),
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

function toListItem(
  content: ContentRow,
  translations: TranslationRow[],
  boardKeys?: string[],
): AdminEditorialContentListItem | null {
  if (content.contentType !== 'content') return null;
  const primary = pickPrimaryTranslation(translations);
  if (!primary) return null;

  const resolvedBoardKeys = boardKeys?.length ? boardKeys : [normalizeBoardKey(content.boardKey)];

  return {
    id: content.id,
    contentType: 'content',
    boardKey: resolvedBoardKeys[0] ?? normalizeBoardKey(content.boardKey),
    boardKeys: resolvedBoardKeys,
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

async function findContentIdsBySearch(
  search: string,
  options: {
    boardKey?: string;
    knownBoardKeys?: string[];
    contentModule?: EditorialContentModule;
  },
) {
  const pattern = `%${search.trim()}%`;
  const boardConditions = [eq(editorialContents.contentType, 'content')];

  if (options.contentModule) {
    boardConditions.push(eq(editorialContents.contentModule, options.contentModule));
  }

  if (options.boardKey === '__unassigned__' && options.knownBoardKeys?.length) {
    const assignedToKnown = db
      .select({ contentId: editorialContentBoards.contentId })
      .from(editorialContentBoards)
      .where(inArray(editorialContentBoards.boardKey, options.knownBoardKeys.map(normalizeBoardKey)));
    boardConditions.push(notInArray(editorialContents.id, assignedToKnown));
  } else if (options.boardKey && options.boardKey !== '__unassigned__') {
    const boardContentIds = db
      .select({ contentId: editorialContentBoards.contentId })
      .from(editorialContentBoards)
      .where(eq(editorialContentBoards.boardKey, normalizeBoardKey(options.boardKey)));
    boardConditions.push(inArray(editorialContents.id, boardContentIds));
  }

  const rows = await db
    .selectDistinct({ contentId: editorialContentTranslations.contentId })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(
      ...boardConditions,
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

function buildContentListConditions(options: {
  boardKey?: string;
  keyword?: string;
  knownBoardKeys?: string[];
  matchingIds?: string[] | null;
  contentModule?: EditorialContentModule;
}) {
  const conditions = [eq(editorialContents.contentType, 'content')];

  if (options.contentModule) {
    conditions.push(eq(editorialContents.contentModule, options.contentModule));
  }

  if (options.boardKey === '__unassigned__' && options.knownBoardKeys?.length) {
    const assignedToKnown = db
      .select({ contentId: editorialContentBoards.contentId })
      .from(editorialContentBoards)
      .where(inArray(editorialContentBoards.boardKey, options.knownBoardKeys.map(normalizeBoardKey)));
    conditions.push(notInArray(editorialContents.id, assignedToKnown));
  } else if (options.boardKey && options.boardKey !== '__unassigned__') {
    const boardContentIds = db
      .select({ contentId: editorialContentBoards.contentId })
      .from(editorialContentBoards)
      .where(eq(editorialContentBoards.boardKey, normalizeBoardKey(options.boardKey)));
    conditions.push(inArray(editorialContents.id, boardContentIds));
  }

  if (options.matchingIds !== undefined && options.matchingIds !== null) {
    if (!options.matchingIds.length) {
      return null;
    }
    conditions.push(inArray(editorialContents.id, options.matchingIds));
  }

  return conditions;
}

export type AdminEditorialContentListQuery = {
  boardKey?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  knownBoardKeys?: string[];
  contentModule?: EditorialContentModule;
};

export type AdminEditorialContentListPage = {
  items: AdminEditorialContentListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

export async function getAdminEditorialContentListPaginated(
  options: AdminEditorialContentListQuery = {},
): Promise<AdminEditorialContentListPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const keyword = options.keyword?.trim() ?? '';

  const matchingIds = keyword
    ? await findContentIdsBySearch(keyword, {
      boardKey: options.boardKey,
      knownBoardKeys: options.knownBoardKeys,
      contentModule: options.contentModule,
    })
    : undefined;

  const conditions = buildContentListConditions({
    boardKey: options.boardKey,
    knownBoardKeys: options.knownBoardKeys,
    matchingIds: keyword ? matchingIds ?? [] : undefined,
    contentModule: options.contentModule,
  });

  if (!conditions) {
    return { items: [], total: 0, page, pageSize };
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ value: count() })
    .from(editorialContents)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const contentRows = await db
    .select()
    .from(editorialContents)
    .where(whereClause)
    .orderBy(desc(editorialContents.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const translationMap = await loadTranslationsByContentIds(contentRows.map((row) => row.id));
  const boardKeysMap = await loadBoardKeysByContentIds(contentRows.map((row) => row.id));

  const items = contentRows
    .map((content) => toListItem(
      content,
      translationMap.get(content.id) ?? [],
      boardKeysMap.get(content.id),
    ))
    .filter((item): item is AdminEditorialContentListItem => Boolean(item))
    .sort(sortListItems);

  return { items, total, page, pageSize };
}

export async function getAdminEditorialContentList(search?: string): Promise<AdminEditorialContentListItem[]> {
  const result = await getAdminEditorialContentListPaginated({
    keyword: search,
    page: 1,
    pageSize: 10000,
  });
  return result.items;
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

  const boardKeysMap = await loadBoardKeysByContentIds([contentId]);
  return toListItem(content, translations, boardKeysMap.get(contentId));
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

  const boardKeysMap = await loadBoardKeysByContentIds([contentId]);
  const boardKeys = boardKeysMap.get(contentId);

  return translations
    .map((translation) => normalizeTranslationRow(content, translation, boardKeys))
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

  return row ? normalizeTranslationRow(row.content, row.translation, (await loadBoardKeysByContentIds([row.content.id])).get(row.content.id)) : null;
}

/** @deprecated */
export async function getAdminEditorialContentEntry(id: string) {
  return getAdminEditorialContentTranslation(id);
}

export async function findAdminEditorialContentTranslationBySlug(
  slug: string,
  locale?: string,
  excludeTranslationId?: string,
  contentModule?: EditorialContentModule,
) {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedLocale = normalizeLocale(locale);

  const conditions = [
    eq(editorialContentTranslations.contentType, 'content'),
    eq(editorialContentTranslations.slug, normalizedSlug),
    eq(editorialContentTranslations.locale, normalizedLocale),
  ];
  if (contentModule) {
    conditions.push(eq(editorialContentTranslations.contentModule, contentModule));
  }
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

  return row ? normalizeTranslationRow(row.content, row.translation, (await loadBoardKeysByContentIds([row.content.id])).get(row.content.id)) : null;
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

  return row ? normalizeTranslationRow(row.content, row.translation, (await loadBoardKeysByContentIds([row.content.id])).get(row.content.id)) : null;
}

/** @deprecated */
export async function findAdminEditorialContentEntryByGroupAndLocale(groupId: string, locale: string, excludeId?: string) {
  return findAdminEditorialContentTranslationByContentAndLocale(groupId, locale, excludeId);
}

export async function createAdminEditorialContentTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  if (input.contentId) {
    const existingLocale = await findAdminEditorialContentTranslationByContentAndLocale(
      input.contentId,
      next.locale,
    );
    if (existingLocale) {
      return updateAdminEditorialContentTranslation(existingLocale.id, input);
    }
  }

  const contentId = input.contentId
    ? input.contentId
    : (await db
      .insert(editorialContents)
      .values({
        contentType: 'content',
        contentModule: next.contentModule,
        boardKey: next.boardKey,
        status: next.status,
        publishedAt: next.publishedAt ? new Date(next.publishedAt) : null,
      })
      .returning({ id: editorialContents.id }))[0]?.id;

  if (!contentId) return null;

  if (input.contentId) {
    const [existingContent] = await db
      .select()
      .from(editorialContents)
      .where(eq(editorialContents.id, contentId))
      .limit(1);

    if (existingContent && existingContent.contentModule !== next.contentModule) {
      return null;
    }

    await db
      .update(editorialContents)
      .set({
        contentModule: next.contentModule,
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
      contentModule: next.contentModule,
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

  const syncResult = await syncContentBoards(contentId, next.boardKeys, {
    lockedBoardKey: input.boardKey ?? next.boardKey,
    contentModule: next.contentModule,
  });
  if (!syncResult.ok) return null;

  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, contentId))
    .limit(1);

  return content ? normalizeTranslationRow(content, created, syncResult.boardKeys) : null;
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
    contentModule: input.contentModule ?? resolveContentModuleByBoard(input.boardKey ?? current.boardKey),
    boardKey: input.boardKey ?? current.boardKey,
    boardKeys: input.boardKeys ?? current.boardKeys,
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
      contentModule: merged.contentModule,
      boardKey: merged.boardKey,
      status: merged.status,
      publishedAt: merged.publishedAt ? new Date(merged.publishedAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(editorialContents.id, current.contentId));

  const [updated] = await db
    .update(editorialContentTranslations)
    .set({
      contentModule: merged.contentModule,
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

  const syncResult = await syncContentBoards(current.contentId, merged.boardKeys, {
    lockedBoardKey: input.boardKey ?? merged.boardKey,
    contentModule: merged.contentModule,
  });
  if (!syncResult.ok) return null;

  const [content] = await db
    .select()
    .from(editorialContents)
    .where(eq(editorialContents.id, current.contentId))
    .limit(1);

  return content ? normalizeTranslationRow(content, updated, syncResult.boardKeys) : null;
}

/** @deprecated */
export async function updateAdminEditorialContentEntry(id: string, input: TranslationPatchInput) {
  return updateAdminEditorialContentTranslation(id, input);
}

export async function updateAdminEditorialContent(contentId: string, input: ContentPatchInput) {
  const current = await getAdminEditorialContentListItem(contentId);
  if (!current) return null;

  if (input.boardKeys?.length) {
    const [existingContent] = await db
      .select()
      .from(editorialContents)
      .where(eq(editorialContents.id, contentId))
      .limit(1);
    if (!existingContent) return null;

    const syncResult = await syncContentBoards(contentId, input.boardKeys, {
      lockedBoardKey: input.boardKey ?? current.boardKey,
      contentModule: existingContent.contentModule,
    });
    if (!syncResult.ok) return null;
  }

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

  const boardKeysMap = await loadBoardKeysByContentIds([contentId]);
  return toListItem(updated, translations, boardKeysMap.get(contentId));
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
