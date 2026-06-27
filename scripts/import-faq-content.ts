import '@/lib/env';

import { and, eq, sql } from 'drizzle-orm';

import {
  glossaryTerms,
  storefrontFaqs,
  techFaqEntries,
  type GlossaryTerm,
  type TechFaqEntry,
} from '@/lib/knowledge';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
} from '@/server/db/schema';

const DEFAULT_LOCALE = 'en';
const CONTENT_MODULE = 'faq' as const;

type ImportEntry = {
  slug: string;
  boardKey: 'faq' | 'glossary';
  title: string;
  summary: string | null;
  body: string;
  tags: string[];
  relatedProductSlugs: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphsToHtml(paragraphs: string[]) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

function buildGeneralFaqBody(answer: string) {
  return `<p>${escapeHtml(answer)}</p>`;
}

function buildTechFaqBody(entry: TechFaqEntry) {
  const parts: string[] = [];
  if (entry.answer.paragraphs.length) {
    parts.push(paragraphsToHtml(entry.answer.paragraphs));
  }
  if (entry.answer.bullets?.length) {
    parts.push(`<ul>${entry.answer.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
  }
  if (entry.answer.formula) {
    parts.push(
      `<p><strong>${escapeHtml(entry.answer.formula.label)}</strong></p><pre><code>${escapeHtml(entry.answer.formula.expression)}</code></pre>`,
    );
  }
  if (entry.answer.codeSample) {
    parts.push(
      `<p><strong>${escapeHtml(entry.answer.codeSample.label)}</strong></p><pre><code>${escapeHtml(entry.answer.codeSample.code)}</code></pre>`,
    );
  }
  return parts.join('') || '<p></p>';
}

function buildGlossaryBody(term: GlossaryTerm) {
  return paragraphsToHtml(term.definition) || '<p></p>';
}

function buildManifest(): ImportEntry[] {
  const faqEntries: ImportEntry[] = [
    ...storefrontFaqs.map((item) => ({
      slug: item.id,
      boardKey: 'faq' as const,
      title: item.question,
      summary: null,
      body: buildGeneralFaqBody(item.answer),
      tags: ['General'],
      relatedProductSlugs: [],
    })),
    ...techFaqEntries.map((item) => ({
      slug: item.id,
      boardKey: 'faq' as const,
      title: item.question,
      summary: item.searchSummary,
      body: buildTechFaqBody(item),
      tags: [item.category],
      relatedProductSlugs: item.relatedProductSlugs,
    })),
  ];

  const glossaryEntries: ImportEntry[] = glossaryTerms.map((item) => ({
    slug: item.id,
    boardKey: 'glossary' as const,
    title: item.term,
    summary: item.searchSummary,
    body: buildGlossaryBody(item),
    tags: item.synonyms.length ? [...item.synonyms] : [],
    relatedProductSlugs: item.relatedProductSlugs,
  }));

  return [...faqEntries, ...glossaryEntries];
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

async function syncBoards(contentId: string, boardKey: string) {
  await db!
    .delete(editorialContentBoards)
    .where(eq(editorialContentBoards.contentId, contentId));
  await db!.insert(editorialContentBoards).values({ contentId, boardKey });
}

async function upsertEntry(entry: ImportEntry): Promise<'created' | 'updated'> {
  const existing = await findTranslationBySlug(entry.slug);
  const now = new Date();
  const publishedAt = now;
  const payload = {
    body: entry.body,
    coverUrl: null,
    coverAlt: null,
    tags: entry.tags,
    relatedProductSlugs: entry.relatedProductSlugs,
  };

  if (existing) {
    await db!.transaction(async (tx) => {
      await tx
        .update(editorialContents)
        .set({
          contentModule: CONTENT_MODULE,
          boardKey: entry.boardKey,
          status: 'published',
          publishedAt,
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
          payload,
          updatedAt: now,
        })
        .where(eq(editorialContentTranslations.id, existing.translationId));
    });

    await syncBoards(existing.contentId, entry.boardKey);
    return 'updated';
  }

  await db!.transaction(async (tx) => {
    const [createdContent] = await tx
      .insert(editorialContents)
      .values({
        contentType: 'content',
        contentModule: CONTENT_MODULE,
        boardKey: entry.boardKey,
        status: 'published',
        publishedAt,
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
      payload,
    });

    await tx.insert(editorialContentBoards).values({
      contentId: createdContent.id,
      boardKey: entry.boardKey,
    });
  });

  return 'created';
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-faq-content');
  }

  const manifest = buildManifest();
  const stats = { created: 0, updated: 0, faq: 0, glossary: 0 };

  for (const entry of manifest) {
    const result = await upsertEntry(entry);
    stats[result] += 1;
    if (entry.boardKey === 'faq') stats.faq += 1;
    else stats.glossary += 1;
    console.log(`${result === 'created' ? '新建' : '更新'}: [${entry.boardKey}] ${entry.title} (${entry.slug})`);
  }

  const [faqCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .where(and(eq(editorialContents.contentModule, CONTENT_MODULE), eq(editorialContentBoards.boardKey, 'faq')));

  const [glossaryCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .where(and(eq(editorialContents.contentModule, CONTENT_MODULE), eq(editorialContentBoards.boardKey, 'glossary')));

  console.log('\n导入完成:', {
    created: stats.created,
    updated: stats.updated,
    total: manifest.length,
    faqBoard: Number(faqCount?.total ?? 0),
    glossaryBoard: Number(glossaryCount?.total ?? 0),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
