import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import {
  type EditorialContentPayload,
} from '@/lib/editorial-content';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
} from '@/server/db/schema';

type TranslationRow = typeof editorialContentTranslations.$inferSelect;

function pickTranslation(rows: TranslationRow[], locale: Locale) {
  if (!rows.length) return null;
  const exact = rows.find((row) => row.locale === locale);
  if (exact) return exact;
  const english = rows.find((row) => row.locale.toLowerCase().startsWith('en'));
  return english ?? rows[0] ?? null;
}

function normalizePayload(payload: unknown): EditorialContentPayload {
  const value = (payload ?? {}) as Partial<EditorialContentPayload>;
  return {
    body: typeof value.body === 'string' ? value.body : '',
    coverUrl: typeof value.coverUrl === 'string' ? value.coverUrl : null,
    coverAlt: typeof value.coverAlt === 'string' ? value.coverAlt : null,
    tags: Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === 'string') : [],
    relatedProductSlugs: Array.isArray(value.relatedProductSlugs)
      ? value.relatedProductSlugs.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

async function loadBoardKeys(contentId: string) {
  const rows = await db
    .select({ boardKey: editorialContentBoards.boardKey })
    .from(editorialContentBoards)
    .where(eq(editorialContentBoards.contentId, contentId))
    .orderBy(asc(editorialContentBoards.boardKey));
  return rows.map((row) => row.boardKey);
}

export async function getStorefrontBoardFaqs(boardKeyInput: string, localeInput?: string | null) {
  const locale = normalizeLocale(localeInput);
  const boardKey = boardKeyInput.trim();
  if (!boardKey.trim()) {
    return { locale, boardKey, items: [] as { id: string; title: string; body: string }[] };
  }

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'faq'),
      eq(editorialContentBoards.boardKey, boardKey),
    ))
    .orderBy(desc(editorialContents.publishedAt), asc(editorialContentTranslations.title));

  const grouped = new Map<string, { content: typeof editorialContents.$inferSelect; translations: TranslationRow[] }>();
  for (const row of rows) {
    const bucket = grouped.get(row.content.id) ?? { content: row.content, translations: [] };
    bucket.translations.push(row.translation);
    grouped.set(row.content.id, bucket);
  }

  const items = [...grouped.values()].map(({ content, translations }) => {
    const picked = pickTranslation(translations, locale)!;
    const payload = normalizePayload(picked.payload);
    return {
      id: content.id,
      title: picked.title,
      body: payload.body,
    };
  });

  return { locale, boardKey, items };
}

export async function getStorefrontBoardBlogs(boardKeyInput: string, localeInput?: string | null) {
  const locale = normalizeLocale(localeInput);
  const boardKey = boardKeyInput.trim();
  if (!boardKey.trim()) {
    return {
      locale,
      boardKey,
      items: [] as { id: string; title: string; summary: string | null; slug: string; publishedAt: string | null }[],
    };
  }

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
      eq(editorialContentBoards.boardKey, boardKey),
    ))
    .orderBy(desc(editorialContents.publishedAt), asc(editorialContentTranslations.title));

  const grouped = new Map<string, { content: typeof editorialContents.$inferSelect; translations: TranslationRow[] }>();
  for (const row of rows) {
    const bucket = grouped.get(row.content.id) ?? { content: row.content, translations: [] };
    bucket.translations.push(row.translation);
    grouped.set(row.content.id, bucket);
  }

  const items = [...grouped.values()].map(({ content, translations }) => {
    const picked = pickTranslation(translations, locale)!;
    return {
      id: content.id,
      title: picked.title,
      summary: picked.summary,
      slug: picked.slug,
      publishedAt: content.publishedAt?.toISOString() ?? null,
    };
  });

  return { locale, boardKey, items };
}

export async function getStorefrontBlogDetail(contentId: string, localeInput?: string | null) {
  const locale = normalizeLocale(localeInput);

  const [content] = await db
    .select()
    .from(editorialContents)
    .where(and(
      eq(editorialContents.id, contentId),
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
    ))
    .limit(1);

  if (!content) return null;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId));

  const picked = pickTranslation(translations, locale);
  if (!picked) return null;

  const payload = normalizePayload(picked.payload);
  const boardKeys = await loadBoardKeys(contentId);

  return {
    id: content.id,
    title: picked.title,
    summary: picked.summary,
    body: payload.body,
    slug: picked.slug,
    cover: payload.coverUrl ? { url: payload.coverUrl, alt: payload.coverAlt ?? picked.title } : null,
    seo: {
      title: picked.seoTitle,
      description: picked.seoDescription,
    },
    publishedAt: content.publishedAt?.toISOString() ?? null,
    boardKeys,
    tags: payload.tags,
    relatedProductSlugs: payload.relatedProductSlugs,
  };
}
