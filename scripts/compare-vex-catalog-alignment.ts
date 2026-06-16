import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { categories, products } from '@/server/db/schema';

type ProductSnapshot = {
  url: string;
  title?: string | null;
  seoTitle?: string | null;
};

type CategorySnapshot = {
  url: string;
  title?: string | null;
  seoTitle?: string | null;
};

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

function categorySlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const withoutLeadId = segment.replace(/^\d+-/, '');
  const withoutTailId = withoutLeadId.replace(/-\d+$/, '');
  return normalizeSlug(withoutTailId);
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function inferCategorySlugFromProduct(item: ProductSnapshot) {
  const candidates = [item.title, item.seoTitle]
    .filter((value): value is string => Boolean(value))
    .map((value) => decodeBasicEntities(value).toLowerCase());

  for (const candidate of candidates) {
    const nemaMatch = candidate.match(/\bnema[\s-]*(8|11|14|16|17|23|24|34)\b/);
    if (nemaMatch) {
      return `nema-${nemaMatch[1]}-stepper-motor`;
    }

    const leadingFrameMatch = candidate.match(/^(8|11|14|16|17|23|24|34)\b.*stepper motor/);
    if (leadingFrameMatch) {
      return `nema-${leadingFrameMatch[1]}-stepper-motor`;
    }

    if (candidate.includes('integrated stepper')) {
      return 'integrated-stepper-motor';
    }
    if (candidate.includes('closed loop')) {
      return 'closed-loop-stepper-motor';
    }
    if (candidate.includes('brushless spindle')) {
      return 'brushless-spindle-motor';
    }
    if (candidate.includes('brushless dc')) {
      return 'brushless-dc-motor';
    }
    if (candidate.includes('power supply')) {
      return 'power-supply';
    }
    if (candidate.includes('driver')) {
      return 'stepper-motor-driver';
    }
    if (candidate.includes('stepper motor')) {
      return 'stepper-motor';
    }
  }

  return null;
}

async function loadJson<T>(inputDir: string, fileName: string): Promise<T> {
  const fullPath = path.join(inputDir, fileName);
  const raw = await readFile(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

async function main() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  const inputDir = path.resolve(process.cwd(), 'migration/vexmotor');
  const [productsSnapshot, categoriesSnapshot] = await Promise.all([
    loadJson<ProductSnapshot[]>(inputDir, 'products.json'),
    loadJson<CategorySnapshot[]>(inputDir, 'categories.json'),
  ]);

  const expectedCounts = new Map<string, { expectedName: string; expectedProductCount: number }>();
  const unmatchedSnapshotProducts: Array<{ url: string; title: string | null; categorySlug: string }> = [];
  const inferredSnapshotProducts: Array<{ url: string; title: string | null; inferredCategorySlug: string }> = [];

  for (const item of categoriesSnapshot) {
    const url = new URL(item.url);
    const slug = categorySlugFromPath(url.pathname);
    if (!slug) {
      continue;
    }

    const expectedName = decodeBasicEntities((item.title || item.seoTitle || slug).trim());
    const existing = expectedCounts.get(slug);
    if (existing) {
      existing.expectedName = existing.expectedName || expectedName;
      continue;
    }

    expectedCounts.set(slug, {
      expectedName,
      expectedProductCount: 0,
    });
  }

  for (const item of productsSnapshot) {
    const url = new URL(item.url);
    const slug = categorySlugFromPath(url.pathname);
    const existing = expectedCounts.get(slug);
    if (!existing) {
      const inferredCategorySlug = inferCategorySlugFromProduct(item);
      const inferredCategory = inferredCategorySlug ? expectedCounts.get(inferredCategorySlug) : null;
      if (inferredCategory && inferredCategorySlug) {
        inferredCategory.expectedProductCount += 1;
        inferredSnapshotProducts.push({
          url: item.url,
          title: item.title ?? item.seoTitle ?? null,
          inferredCategorySlug,
        });
        continue;
      }

      unmatchedSnapshotProducts.push({
        url: item.url,
        title: item.title ?? item.seoTitle ?? null,
        categorySlug: slug,
      });
      continue;
    }

    existing.expectedProductCount += 1;
  }

  const dbCategories = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, status: categories.status })
    .from(categories)
    .where(eq(categories.status, 'active'))
    .orderBy(asc(categories.name));

  const dbCounts = await db
    .select({ categoryId: products.defaultCategoryId, total: count() })
    .from(products)
    .where(eq(products.status, 'active'))
    .groupBy(products.defaultCategoryId);

  const dbCountByCategoryId = new Map(dbCounts.map((item) => [item.categoryId, Number(item.total)]));

  const comparisonRows = dbCategories.map((item) => {
    const expected = expectedCounts.get(item.slug) ?? null;
    const actualProductCount = dbCountByCategoryId.get(item.id) ?? 0;

    return {
      slug: item.slug,
      dbName: item.name,
      expectedName: expected?.expectedName ?? null,
      expectedProductCount: expected?.expectedProductCount ?? 0,
      actualProductCount,
      matches: expected ? actualProductCount === expected.expectedProductCount : false,
    };
  });

  const missingActiveCategories = Array.from(expectedCounts.entries())
    .filter(([slug]) => !dbCategories.some((item) => item.slug === slug))
    .map(([slug, item]) => ({
      slug,
      expectedName: item.expectedName,
      expectedProductCount: item.expectedProductCount,
    }));

  const mismatches = comparisonRows.filter((item) => !item.matches);

  console.log(
    JSON.stringify(
      {
        snapshotCategoryCount: expectedCounts.size,
        snapshotProductCount: productsSnapshot.length,
        dbActiveCategoryCount: dbCategories.length,
        dbActiveProductCount: Array.from(dbCountByCategoryId.values()).reduce((sum, value) => sum + value, 0),
        mismatches,
        missingActiveCategories,
        alignedCategories: comparisonRows.filter((item) => item.matches).length,
        inferredSnapshotProducts,
        unmatchedSnapshotProducts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});