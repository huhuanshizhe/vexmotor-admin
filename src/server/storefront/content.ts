import { and, eq, inArray } from 'drizzle-orm';

import { listMemoryCmsPages } from '@/server/admin/memory-store';
import { db } from '@/server/db';
import { cmsPages } from '@/server/db/schema';
import type { Locale } from '@/lib/i18n';

type StorefrontCmsPage = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
};

function normalizeSlugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getLegacySlugCandidates(legacySlug: string, locale: Locale) {
  const normalized = normalizeSlugPart(legacySlug);
  const withoutIdPrefix = normalized.replace(/^\d+-/, '');
  const localePrefixRegex = /^(en|es|de|fr)-/;
  const baseWithoutLocalePrefix = withoutIdPrefix.replace(localePrefixRegex, '');

  const candidates = [
    locale !== 'en' ? `${locale}-${baseWithoutLocalePrefix}` : null,
    withoutIdPrefix,
    normalized,
    baseWithoutLocalePrefix,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

export async function getCmsPageByLegacySlug(legacySlug: string, locale: Locale): Promise<StorefrontCmsPage | null> {
  const candidates = getLegacySlugCandidates(legacySlug, locale);
  if (!candidates.length) {
    return null;
  }

  if (!db) {
    const memoryPages = listMemoryCmsPages().filter((item) => item.status === 'published');
    const pageBySlug = new Map(memoryPages.map((item) => [item.slug, item]));
    for (const slug of candidates) {
      const page = pageBySlug.get(slug);
      if (page) {
        return page;
      }
    }
    return null;
  }

  try {
    const rows = await db
      .select({
        id: cmsPages.id,
        title: cmsPages.title,
        slug: cmsPages.slug,
        summary: cmsPages.summary,
        content: cmsPages.content,
        seoTitle: cmsPages.seoTitle,
        seoDescription: cmsPages.seoDescription,
        publishedAt: cmsPages.publishedAt,
      })
      .from(cmsPages)
      .where(and(inArray(cmsPages.slug, candidates), eq(cmsPages.status, 'published')));

    if (!rows.length) {
      return null;
    }

    const pageBySlug = new Map(rows.map((row) => [row.slug, row]));
    for (const slug of candidates) {
      const page = pageBySlug.get(slug);
      if (page) {
        return page;
      }
    }

    return rows[0] ?? null;
  } catch {
    return null;
  }
}
