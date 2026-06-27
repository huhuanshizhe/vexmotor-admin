import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import { resolveBlogCategorySlug } from '@/lib/blog-categories';
import {
  type EditorialContentPayload,
} from '@/lib/editorial-content';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
} from '@/server/db/schema';

type TranslationRow = typeof editorialContentTranslations.$inferSelect;

export type StorefrontBlogAuthor = {
  name: string | null;
  title: string | null;
  bio: string | null;
};

function pickTranslation(rows: TranslationRow[], locale: Locale) {
  if (!rows.length) return null;
  const exact = rows.find((row) => row.locale === locale);
  if (exact) return exact;
  const english = rows.find((row) => row.locale.toLowerCase().startsWith('en'));
  return english ?? rows[0] ?? null;
}

function normalizeCoverStyle(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    return null;
  }
  return value;
}

function normalizePayload(payload: unknown): EditorialContentPayload {
  const value = (payload ?? {}) as Partial<EditorialContentPayload>;
  return {
    body: typeof value.body === 'string' ? value.body : '',
    coverStyle: normalizeCoverStyle(value.coverStyle),
    tags: Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === 'string') : [],
    relatedProductSlugs: Array.isArray(value.relatedProductSlugs)
      ? value.relatedProductSlugs.filter((item): item is string => typeof item === 'string')
      : [],
    authorName: typeof value.authorName === 'string' ? value.authorName : null,
    authorTitle: typeof value.authorTitle === 'string' ? value.authorTitle : null,
    authorBio: typeof value.authorBio === 'string' ? value.authorBio : null,
    category: typeof value.category === 'string' ? value.category : null,
  };
}

function buildAuthor(payload: EditorialContentPayload): StorefrontBlogAuthor {
  return {
    name: payload.authorName ?? null,
    title: payload.authorTitle ?? null,
    bio: payload.authorBio ?? null,
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
      items: [] as {
        id: string;
        title: string;
        summary: string | null;
        slug: string;
        category: string | null;
        categorySlug: string | null;
        coverStyle: number | null;
        author: StorefrontBlogAuthor;
        tags: string[];
        publishedAt: string | null;
      }[],
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
    const payload = normalizePayload(picked.payload);
    return {
      id: content.id,
      title: picked.title,
      summary: picked.summary,
      slug: picked.slug,
      category: payload.category,
      categorySlug: resolveBlogCategorySlug(payload.category),
      coverStyle: payload.coverStyle,
      author: buildAuthor(payload),
      tags: payload.tags,
      publishedAt: content.publishedAt?.toISOString() ?? null,
    };
  });

  return { locale, boardKey, items };
}

export async function getStorefrontBlogDetailBySlug(slugInput: string, localeInput?: string | null) {
  const locale = normalizeLocale(localeInput);
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(
      eq(editorialContentTranslations.slug, slug),
      eq(editorialContentTranslations.contentModule, 'editorial'),
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
    ));

  if (!rows.length) return null;

  const preferred = rows.find((row) => row.translation.locale === locale)
    ?? rows.find((row) => row.translation.locale.toLowerCase().startsWith('en'))
    ?? rows[0];
  if (!preferred) return null;

  const content = preferred.content;
  const contentId = content.id;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId));

  const picked = pickTranslation(translations, locale) ?? preferred.translation;
  const payload = normalizePayload(picked.payload);
  const boardKeys = await loadBoardKeys(contentId);

  return {
    id: content.id,
    title: picked.title,
    summary: picked.summary,
    body: payload.body,
    slug: picked.slug,
    category: payload.category,
    categorySlug: resolveBlogCategorySlug(payload.category),
    coverStyle: payload.coverStyle,
    author: buildAuthor(payload),
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
