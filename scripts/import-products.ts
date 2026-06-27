import '@/lib/env';

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { type AdminProductPayload } from '@/lib/product-content';
import { resolveSlugForSave } from '@/lib/slug';
import { db } from '@/server/db';
import {
  brandTranslations,
  categories,
  categoryTranslations,
  productCategories,
  productTranslations,
  products,
} from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

const DEFAULT_LOCALE = DEFAULT_PRODUCT_LOCALE;
const DEFAULT_CSV_PATH = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  'Downloads',
  'product_2026-06-26_095135.csv',
);

const CATEGORY_SLUGS = [
  'nema-8-stepper-motor',
  'nema-11-stepper-motor',
  'nema-14-stepper-motor',
  'nema-16-stepper-motor',
  'nema-17-stepper-motor',
  'nema-23-stepper-motor',
  'nema-24-stepper-motor',
  'nema-34-stepper-motor',
  'power-supply',
  'stepper-motor-driver',
  'closed-loop-stepper-motor',
  'brushless-spindle-motor',
  'brushless-dc-motor',
  'integrated-stepper-motor',
] as const;

const PRESTASHOP_CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  'Closed Loop Stepper Motor': 'closed-loop-stepper-motor',
  'Power Supply': 'power-supply',
  'Stepper Motor Driver': 'stepper-motor-driver',
  'Brushless Spindle Motor': 'brushless-spindle-motor',
  'Brushless DC Motor': 'brushless-dc-motor',
  'Integrated Stepper Motor': 'integrated-stepper-motor',
  'Nema 8 Stepper Motor': 'nema-8-stepper-motor',
  'Nema 11 Stepper Motor': 'nema-11-stepper-motor',
  'Nema 14 Stepper Motor': 'nema-14-stepper-motor',
  'Nema 16 Stepper Motor': 'nema-16-stepper-motor',
  'Nema 17 Stepper Motor': 'nema-17-stepper-motor',
  'Nema 23 Stepper Motor': 'nema-23-stepper-motor',
  'Nema 24 Stepper Motor': 'nema-24-stepper-motor',
  'Nema 34 Stepper Motor': 'nema-34-stepper-motor',
};

type CrawlAttachment = {
  url: string;
  label: string;
  mimeType: string;
};

type CrawlProduct = {
  sourceUrl: string;
  canonicalUrl: string;
  prestashopProductId: string | null;
  categorySlug: string;
  name: string;
  spu: string;
  price: string;
  currency: string;
  shortDescription: string | null;
  descriptionLong: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  galleryImages: string[];
  attachments: CrawlAttachment[];
  error: string | null;
};

type CsvRow = {
  productId: string;
  image: string;
  name: string;
  reference: string;
  category: string;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function parseSemicolonCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ';') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim()));
}

function parseCsvRows(content: string): CsvRow[] {
  const rows = parseSemicolonCsv(content);
  if (!rows.length) return [];

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const idIndex = header.findIndex((cell) => cell.includes('product id'));
  const imageIndex = header.findIndex((cell) => cell === 'image');
  const nameIndex = header.findIndex((cell) => cell === 'name');
  const referenceIndex = header.findIndex((cell) => cell === 'reference');
  const categoryIndex = header.findIndex((cell) => cell === 'category');

  return rows.slice(1).map((cells) => ({
    productId: cells[idIndex]?.trim() ?? '',
    image: cells[imageIndex]?.trim() ?? '',
    name: decodeBasicEntities(cells[nameIndex]?.trim() ?? ''),
    reference: cells[referenceIndex]?.trim() ?? '',
    category: decodeBasicEntities(cells[categoryIndex]?.trim() ?? ''),
  })).filter((row) => row.name);
}

function normalizeNameKey(value: string) {
  return value.toLowerCase().replace(/[_\s·]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildPayload(product: CrawlProduct): AdminProductPayload {
  const coverUrl = product.galleryImages[0] ?? null;
  const gallery = product.galleryImages.slice(coverUrl ? 1 : 0).map((url) => ({
    url,
    alt: product.name,
    width: null,
    height: null,
  }));

  return {
    coverUrl,
    coverAlt: coverUrl ? product.name : null,
    gallery,
    tags: [],
    attachments: product.attachments.map((item) => ({
      name: item.label,
      url: item.url,
      mimeType: item.mimeType,
    })),
    certifications: [],
  };
}

async function loadBrandId() {
  const [row] = await db!
    .select({ brandId: brandTranslations.brandId })
    .from(brandTranslations)
    .where(and(eq(brandTranslations.slug, 'stepmotech'), eq(brandTranslations.locale, DEFAULT_LOCALE)))
    .limit(1);

  if (!row) {
    throw new Error('未找到 stepmotech 品牌，请先在 admin 中创建 slug=stepmotech 的品牌');
  }

  return row.brandId;
}

async function loadCategoryIdBySlug() {
  const rows = await db!
    .select({
      categoryId: categories.id,
      slug: categoryTranslations.slug,
    })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(and(eq(categoryTranslations.locale, DEFAULT_LOCALE), inArray(categoryTranslations.slug, [...CATEGORY_SLUGS])));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.slug, row.categoryId);
  }

  for (const slug of CATEGORY_SLUGS) {
    if (!map.has(slug)) {
      throw new Error(`未找到分类 slug=${slug}，请先执行 pnpm db:import-categories`);
    }
  }

  return map;
}

async function findProductBySpu(spu: string) {
  const [row] = await db!
    .select({ id: products.id })
    .from(products)
    .where(eq(products.spu, spu))
    .limit(1);
  return row ?? null;
}

async function findTranslationBySlug(slug: string, excludeProductId?: string) {
  const rows = await db!
    .select({
      translationId: productTranslations.id,
      productId: productTranslations.productId,
    })
    .from(productTranslations)
    .where(and(eq(productTranslations.slug, slug), eq(productTranslations.locale, DEFAULT_LOCALE)));

  return rows.find((row) => row.productId !== excludeProductId) ?? null;
}

async function resolveUniqueSlug(name: string, excludeProductId?: string) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await findTranslationBySlug(candidate, excludeProductId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function upsertProduct(
  product: CrawlProduct,
  brandId: string,
  categoryIdBySlug: Map<string, string>,
) {
  if (product.error) {
    throw new Error(product.error);
  }

  const categoryId = categoryIdBySlug.get(product.categorySlug);
  if (!categoryId) {
    throw new Error(`Unknown category slug: ${product.categorySlug}`);
  }

  const spu = product.spu.trim();
  const existing = await findProductBySpu(spu);
  const slug = await resolveUniqueSlug(product.name, existing?.id);
  const payload = buildPayload(product);
  const now = new Date();

  const translationValues = {
    locale: DEFAULT_LOCALE,
    name: product.name.trim(),
    slug,
    shortDescription: normalizeText(product.shortDescription),
    description: null,
    descriptionLong: normalizeText(product.descriptionLong),
    seoTitle: normalizeSeoText(product.seoTitle ?? product.name, 255),
    seoDescription: normalizeSeoText(product.seoDescription ?? product.shortDescription, 500),
    price: product.price,
    compareAtPrice: null,
    currencyCode: (product.currency || 'USD').trim().toUpperCase(),
    stockQuantity: 0,
    moq: 1,
    leadTimeMin: 3,
    leadTimeMax: 15,
    leadTimeUnit: 'business_days',
    lifecycleStatus: 'active' as const,
    payload,
    updatedAt: now,
  };

  if (existing) {
    await db!.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          brandId,
          defaultCategoryId: categoryId,
          purchaseMode: 'buy',
          paidSampleEnabled: false,
          featured: false,
          featuredSortOrder: 0,
          status: 'active',
          hasMultipleSpecs: false,
          updatedAt: now,
        })
        .where(eq(products.id, existing.id));

      const [translation] = await tx
        .select({ id: productTranslations.id })
        .from(productTranslations)
        .where(and(eq(productTranslations.productId, existing.id), eq(productTranslations.locale, DEFAULT_LOCALE)))
        .limit(1);

      if (translation) {
        await tx
          .update(productTranslations)
          .set(translationValues)
          .where(eq(productTranslations.id, translation.id));
      } else {
        await tx.insert(productTranslations).values({
          productId: existing.id,
          ...translationValues,
        });
      }

      await tx.delete(productCategories).where(eq(productCategories.productId, existing.id));
      await tx.insert(productCategories).values({ productId: existing.id, categoryId });
    });

    return 'updated' as const;
  }

  await db!.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        spu,
        brandId,
        defaultCategoryId: categoryId,
        purchaseMode: 'buy',
        paidSampleEnabled: false,
        featured: false,
        featuredSortOrder: 0,
        status: 'active',
        hasMultipleSpecs: false,
      })
      .returning({ id: products.id });

    if (!created) {
      throw new Error(`Failed to create product: ${spu}`);
    }

    await tx.insert(productTranslations).values({
      productId: created.id,
      ...translationValues,
    });

    await tx.insert(productCategories).values({
      productId: created.id,
      categoryId,
    });
  });

  return 'created' as const;
}

function crossCheckCsv(productsToImport: CrawlProduct[], csvRows: CsvRow[]) {
  const byId = new Map<string, CrawlProduct>();
  const byName = new Map<string, CrawlProduct>();

  for (const product of productsToImport) {
    if (product.prestashopProductId) {
      byId.set(product.prestashopProductId, product);
    }
    byName.set(normalizeNameKey(product.name), product);
  }

  const matched: Array<{ csv: CsvRow; product: CrawlProduct; categoryMatch: boolean }> = [];
  const unmatched: CsvRow[] = [];
  const categoryMismatch: Array<{ csv: CsvRow; product: CrawlProduct; expectedSlug: string }> = [];

  for (const row of csvRows) {
    const product = byId.get(row.productId) ?? byName.get(normalizeNameKey(row.name));
    if (!product) {
      unmatched.push(row);
      continue;
    }

    const expectedSlug = PRESTASHOP_CATEGORY_NAME_TO_SLUG[row.category] ?? null;
    const categoryMatch = !expectedSlug || expectedSlug === product.categorySlug;
    matched.push({ csv: row, product, categoryMatch });
    if (!categoryMatch && expectedSlug) {
      categoryMismatch.push({ csv: row, product, expectedSlug });
    }
  }

  return { matched, unmatched, categoryMismatch };
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-products');
  }

  const crawlPath = path.resolve(process.cwd(), '../vexmotor/migration/vexmotor/import/products-crawl.json');
  const reportPath = path.resolve(process.cwd(), '../vexmotor/migration/vexmotor/import/import-report.json');
  const csvPath = process.argv.includes('--csv')
    ? process.argv[process.argv.indexOf('--csv') + 1]
    : DEFAULT_CSV_PATH;

  const raw = await readFile(crawlPath, 'utf8');
  const crawlProducts = JSON.parse(raw) as CrawlProduct[];
  const importable = crawlProducts.filter((item) => !item.error);

  const brandId = await loadBrandId();
  const categoryIdBySlug = await loadCategoryIdBySlug();

  const stats = { created: 0, updated: 0, skipped: crawlProducts.length - importable.length, failed: 0 };

  for (const product of importable) {
    try {
      const result = await upsertProduct(product, brandId, categoryIdBySlug);
      stats[result] += 1;
      console.log(`${result === 'created' ? '新建' : '更新'}: ${product.spu} | ${product.name}`);
    } catch (error) {
      stats.failed += 1;
      console.error(`失败: ${product.spu} | ${product.name}`, error);
    }
  }

  let csvReport = null;
  try {
    const csvContent = await readFile(csvPath, 'utf8');
    const csvRows = parseCsvRows(csvContent);
    csvReport = crossCheckCsv(importable, csvRows);
    console.log('\nCSV 交叉校验:', {
      csvRows: csvRows.length,
      matched: csvReport.matched.length,
      unmatched: csvReport.unmatched.length,
      categoryMismatch: csvReport.categoryMismatch.length,
    });
  } catch (error) {
    console.warn('CSV 交叉校验跳过:', error instanceof Error ? error.message : error);
  }

  const [productCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products);

  const report = {
    generatedAt: new Date().toISOString(),
    importStats: stats,
    totalProductsInDb: Number(productCount?.total ?? 0),
    csvCrossCheck: csvReport
      ? {
          matched: csvReport.matched.length,
          unmatched: csvReport.unmatched.map((row) => row.name),
          categoryMismatch: csvReport.categoryMismatch.map((item) => ({
            csvName: item.csv.name,
            csvCategory: item.csv.category,
            crawlCategorySlug: item.product.categorySlug,
            expectedSlug: item.expectedSlug,
          })),
        }
      : null,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log('\n导入完成:', stats);
  console.log('数据库产品总数:', report.totalProductsInDb);
  console.log('报告:', reportPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
