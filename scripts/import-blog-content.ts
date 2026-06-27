import '@/lib/env';

import { and, eq, sql } from 'drizzle-orm';

import {
  blogPosts,
  getBlogAuthorById,
  type BlogBlock,
  type BlogCategory,
  type BlogPost,
  type BlogSection,
} from '@/lib/blog';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
} from '@/server/db/schema';

const DEFAULT_LOCALE = 'en';
const CONTENT_MODULE = 'editorial' as const;
const BOARD_KEY = 'blog' as const;

const COVER_STYLE_BY_CATEGORY: Record<BlogCategory, number> = {
  'Technical Guide': 1,
  'Application Note': 2,
  Tutorial: 3,
  'News & Updates': 4,
};

type ImportEntry = {
  slug: string;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: Date;
  body: string;
  category: string;
  coverStyle: number;
  coverAlt: string;
  tags: string[];
  relatedProductSlugs: string[];
  authorName: string | null;
  authorTitle: string | null;
  authorBio: string | null;
};

import {
  buildCodeBlockHtml,
  buildListHtml,
  buildParagraphHtml,
  buildTableHtml,
  escapeHtml,
} from '@/lib/editorial-html-blocks';

function coverStyleFromCategory(category: BlogCategory): number {
  return COVER_STYLE_BY_CATEGORY[category] ?? 1;
}

function parseSeedPublishedAt(value: string) {
  const normalized = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function buildBlockHtml(block: BlogBlock) {
  if (block.type === 'paragraph') {
    return buildParagraphHtml(block.text);
  }

  if (block.type === 'list') {
    return buildListHtml(block.items);
  }

  if (block.type === 'code') {
    return buildCodeBlockHtml(block.code);
  }

  if (block.type === 'table') {
    return buildTableHtml({
      caption: block.caption,
      columns: block.columns,
      rows: block.rows,
    });
  }

  return '';
}

function buildSectionHtml(section: BlogSection) {
  const blocks = section.blocks.map(buildBlockHtml).join('');
  return `<h2 id="${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>${blocks}`;
}

function buildBlogBody(post: BlogPost) {
  const html = post.sections.map(buildSectionHtml).join('');
  return html || '<p></p>';
}

function buildTags(post: BlogPost) {
  return Array.from(new Set([post.category, ...post.productTopics, post.industry]));
}

function buildImportEntry(post: BlogPost): ImportEntry {
  const author = getBlogAuthorById(post.authorId);

  return {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    seoTitle: post.seoTitle ?? post.title,
    seoDescription: post.seoDescription ?? post.summary,
    publishedAt: parseSeedPublishedAt(post.publishedAt),
    body: buildBlogBody(post),
    category: post.category,
    coverStyle: coverStyleFromCategory(post.category),
    coverAlt: post.coverAlt,
    tags: buildTags(post),
    relatedProductSlugs: [...post.relatedProductSlugs],
    authorName: author?.name ?? null,
    authorTitle: author?.role ?? null,
    authorBio: author?.bio ?? null,
  };
}

async function findTranslationBySlug(slug: string) {
  const [row] = await db!
    .select({
      translationId: editorialContentTranslations.id,
      contentId: editorialContentTranslations.contentId,
    })
    .from(editorialContentTranslations)
    .where(
      and(
        eq(editorialContentTranslations.slug, slug),
        eq(editorialContentTranslations.locale, DEFAULT_LOCALE),
        eq(editorialContentTranslations.contentModule, CONTENT_MODULE),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function syncBoards(contentId: string) {
  await db!
    .delete(editorialContentBoards)
    .where(eq(editorialContentBoards.contentId, contentId));
  await db!.insert(editorialContentBoards).values({ contentId, boardKey: BOARD_KEY });
}

async function upsertEntry(entry: ImportEntry): Promise<'created' | 'updated'> {
  const existing = await findTranslationBySlug(entry.slug);
  const now = new Date();
  const payload = {
    body: entry.body,
    coverUrl: null,
    coverAlt: entry.coverAlt,
    coverStyle: entry.coverStyle,
    tags: entry.tags,
    relatedProductSlugs: entry.relatedProductSlugs,
    authorName: entry.authorName,
    authorTitle: entry.authorTitle,
    authorBio: entry.authorBio,
    category: entry.category,
  };

  if (existing) {
    await db!.transaction(async (tx) => {
      await tx
        .update(editorialContents)
        .set({
          contentModule: CONTENT_MODULE,
          boardKey: BOARD_KEY,
          status: 'published',
          publishedAt: entry.publishedAt,
          updatedAt: now,
        })
        .where(eq(editorialContents.id, existing.contentId));

      await tx
        .update(editorialContentTranslations)
        .set({
          contentModule: CONTENT_MODULE,
          title: entry.title,
          slug: entry.slug,
          summary: entry.summary,
          seoTitle: entry.seoTitle,
          seoDescription: entry.seoDescription,
          payload,
          updatedAt: now,
        })
        .where(eq(editorialContentTranslations.id, existing.translationId));
    });

    await syncBoards(existing.contentId);
    return 'updated';
  }

  await db!.transaction(async (tx) => {
    const [createdContent] = await tx
      .insert(editorialContents)
      .values({
        contentType: 'content',
        contentModule: CONTENT_MODULE,
        boardKey: BOARD_KEY,
        status: 'published',
        publishedAt: entry.publishedAt,
      })
      .returning({ id: editorialContents.id });

    if (!createdContent) {
      throw new Error(`Failed to create editorial content: ${entry.slug}`);
    }

    await tx.insert(editorialContentTranslations).values({
      contentId: createdContent.id,
      contentType: 'content',
      contentModule: CONTENT_MODULE,
      locale: DEFAULT_LOCALE,
      title: entry.title,
      slug: entry.slug,
      summary: entry.summary,
      seoTitle: entry.seoTitle,
      seoDescription: entry.seoDescription,
      payload,
    });

    await tx.insert(editorialContentBoards).values({
      contentId: createdContent.id,
      boardKey: BOARD_KEY,
    });
  });

  return 'created';
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-blog-content');
  }

  const manifest = blogPosts.map(buildImportEntry);
  const stats = { created: 0, updated: 0 };

  for (const entry of manifest) {
    const result = await upsertEntry(entry);
    stats[result] += 1;
    console.log(`${result === 'created' ? '新建' : '更新'}: [${BOARD_KEY}] ${entry.title} (${entry.slug})`);
  }

  const [blogCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .where(and(eq(editorialContents.contentModule, CONTENT_MODULE), eq(editorialContentBoards.boardKey, BOARD_KEY)));

  console.log('\n导入完成:', {
    created: stats.created,
    updated: stats.updated,
    total: manifest.length,
    blogBoard: Number(blogCount?.total ?? 0),
    slugs: manifest.map((entry) => entry.slug),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
