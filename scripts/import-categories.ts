import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq, sql } from 'drizzle-orm';
import postgres from 'postgres';

import { db } from '@/server/db';
import { categories, categoryTranslations } from '@/server/db/schema';

const DEFAULT_LOCALE = 'en';

type CategorySnapshot = {
  url: string;
  title?: string;
  heading?: string;
  seoTitle?: string;
  seoDescription?: string;
};

type SourceCategoryRow = {
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
  status: 'active' | 'inactive';
};

type ManifestEntry = {
  slug: string;
  parentSlug: string | null;
  sortOrder: number;
  featuredOrder: number;
  fallback: SourceCategoryRow;
};

const CATEGORY_MANIFEST: ManifestEntry[] = [
  {
    slug: 'stepper-motor',
    parentSlug: null,
    sortOrder: 1,
    featuredOrder: 15,
    fallback: {
      name: 'Stepper Motor',
      slug: 'stepper-motor',
      description: 'Complete lineup of NEMA stepper motors from top-tier manufacturers.',
      seoTitle: 'Stepper Motor Options That Deliver Precision — Hybrid & NEMA Ready',
      seoDescription: 'NEMA stepper motor deals direct from top-tier manufacturers—high torque, fast shipping, and pricing built for scale.',
      imageUrl: null,
      sortOrder: 1,
      isFeatured: true,
      featuredOrder: 15,
      status: 'active',
    },
  },
  {
    slug: 'power-supply',
    parentSlug: null,
    sortOrder: 2,
    featuredOrder: 10,
    fallback: {
      name: 'Power Supply',
      slug: 'power-supply',
      description: 'Industrial-grade power supplies optimized for stepper motor and driver systems.',
      seoTitle: 'Power Supply',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 2,
      isFeatured: true,
      featuredOrder: 10,
      status: 'active',
    },
  },
  {
    slug: 'stepper-motor-driver',
    parentSlug: null,
    sortOrder: 3,
    featuredOrder: 9,
    fallback: {
      name: 'Stepper Motor Driver',
      slug: 'stepper-motor-driver',
      description: 'Matched driver modules for smooth microstepping control and reliable motor operation.',
      seoTitle: 'Stepper Motor Driver Options That Actually Work – No Guessing Needed',
      seoDescription: 'Find tested stepper motor drivers that fit your build. Quiet, strong, and ready for your next motion control setup. No-nonsense compatibility and specs.',
      imageUrl: null,
      sortOrder: 3,
      isFeatured: true,
      featuredOrder: 9,
      status: 'active',
    },
  },
  {
    slug: 'closed-loop-stepper-motor',
    parentSlug: null,
    sortOrder: 4,
    featuredOrder: 11,
    fallback: {
      name: 'Closed Loop Stepper Motor',
      slug: 'closed-loop-stepper-motor',
      description: 'Smart closed-loop stepper motor systems with encoder feedback for zero step loss.',
      seoTitle: 'Closed Loop Stepper Motor: Smarter Motion Control for CNC & 3D Printing',
      seoDescription: 'Closed loop stepper motor systems built for zero-step loss—even under heavy load. Get tighter control without the tuning headaches.',
      imageUrl: null,
      sortOrder: 4,
      isFeatured: true,
      featuredOrder: 11,
      status: 'active',
    },
  },
  {
    slug: 'brushless-spindle-motor',
    parentSlug: null,
    sortOrder: 5,
    featuredOrder: 13,
    fallback: {
      name: 'Brushless Spindle Motor',
      slug: 'brushless-spindle-motor',
      description: 'Precision brushless spindle motors for CNC machining and high-speed applications.',
      seoTitle: 'Brushless Spindle Motor',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 5,
      isFeatured: true,
      featuredOrder: 13,
      status: 'active',
    },
  },
  {
    slug: 'brushless-dc-motor',
    parentSlug: null,
    sortOrder: 6,
    featuredOrder: 12,
    fallback: {
      name: 'Brushless DC Motor',
      slug: 'brushless-dc-motor',
      description: 'High-efficiency brushless DC motors for continuous duty and long service life.',
      seoTitle: 'Brushless DC Motor',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 6,
      isFeatured: true,
      featuredOrder: 12,
      status: 'active',
    },
  },
  {
    slug: 'integrated-stepper-motor',
    parentSlug: null,
    sortOrder: 7,
    featuredOrder: 14,
    fallback: {
      name: 'Integrated Stepper Motor',
      slug: 'integrated-stepper-motor',
      description: 'All-in-one integrated stepper motors with built-in drivers for simplified wiring.',
      seoTitle: 'Integrated Stepper Motor',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 7,
      isFeatured: true,
      featuredOrder: 14,
      status: 'active',
    },
  },
  {
    slug: 'nema-8-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 1,
    featuredOrder: 1,
    fallback: {
      name: 'Nema 8 Stepper Motor',
      slug: 'nema-8-stepper-motor',
      description: 'Ultra-compact 20mm frame stepper motors for precision micro-devices and small automation.',
      seoTitle: 'NEMA 8 Stepper Motor Lineup Designed for Lightweight, High-Precision Projects',
      seoDescription: 'NEMA 8 stepper motor designs made for high-precision builds—ideal for medical devices, optics, and portable applications.',
      imageUrl: null,
      sortOrder: 1,
      isFeatured: true,
      featuredOrder: 1,
      status: 'active',
    },
  },
  {
    slug: 'nema-11-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 2,
    featuredOrder: 2,
    fallback: {
      name: 'Nema 11 Stepper Motor',
      slug: 'nema-11-stepper-motor',
      description: 'Compact 28mm frame stepper motors for light-duty positioning and feeder systems.',
      seoTitle: 'NEMA Stepper Motor 11 – Precision That Fits in the Palm of Your Hand',
      seoDescription: 'NEMA stepper motor 11 options designed for high-resolution movement—ideal for makers, prototypers, and OEMs building space-constrained machines.',
      imageUrl: null,
      sortOrder: 2,
      isFeatured: true,
      featuredOrder: 2,
      status: 'active',
    },
  },
  {
    slug: 'nema-14-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 3,
    featuredOrder: 3,
    fallback: {
      name: 'Nema 14 Stepper Motor',
      slug: 'nema-14-stepper-motor',
      description: '35mm frame stepper motors balancing size and torque for desktop CNC and 3D printers.',
      seoTitle: 'Nema 14 Stepper Motor – Miniature Power for Precision Applications',
      seoDescription: 'Find reliable Nema 14 stepper motor solutions for your next compact build. Smooth motion, low noise, and consistent torque performance.',
      imageUrl: null,
      sortOrder: 3,
      isFeatured: true,
      featuredOrder: 3,
      status: 'active',
    },
  },
  {
    slug: 'nema-16-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 4,
    featuredOrder: 4,
    fallback: {
      name: 'Nema 16 Stepper Motor',
      slug: 'nema-16-stepper-motor',
      description: '39mm frame stepper motors for mid-range automation and precision equipment.',
      seoTitle: 'NEMA 16 Stepper Motor Options Built for Compact Power — Ships Fast',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 4,
      isFeatured: true,
      featuredOrder: 4,
      status: 'active',
    },
  },
  {
    slug: 'nema-17-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 5,
    featuredOrder: 5,
    fallback: {
      name: 'Nema 17 Stepper Motor',
      slug: 'nema-17-stepper-motor',
      description: '42mm frame stepper motors - the industry standard for 3D printers, CNC, and robotics.',
      seoTitle: 'Nema 17 Stepper Motor – Best-Selling Models for 3D Printers & DIY Projects',
      seoDescription: 'Shop Nema 17 motor deals now. Get powerful, compact stepper motors ideal for automation, 3D printing, and robotics — all at competitive prices.',
      imageUrl: null,
      sortOrder: 5,
      isFeatured: true,
      featuredOrder: 5,
      status: 'active',
    },
  },
  {
    slug: 'nema-23-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 6,
    featuredOrder: 6,
    fallback: {
      name: 'Nema 23 Stepper Motor',
      slug: 'nema-23-stepper-motor',
      description: '57mm frame high-torque stepper motors for CNC routers, milling, and heavy automation.',
      seoTitle: 'Nema 23 Stepper Motor – High-Torque Favorites for CNC & Industrial Use',
      seoDescription: 'Explore powerful Nema 23 stepper motor options trusted by engineers worldwide. Built for control, speed, and long-term reliability.',
      imageUrl: null,
      sortOrder: 6,
      isFeatured: true,
      featuredOrder: 6,
      status: 'active',
    },
  },
  {
    slug: 'nema-24-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 7,
    featuredOrder: 7,
    fallback: {
      name: 'Nema 24 Stepper Motor',
      slug: 'nema-24-stepper-motor',
      description: '60mm frame stepper motors with enhanced torque for industrial motion systems.',
      seoTitle: 'Nema 24 Stepper Motor – Industrial Strength for High-Precision Builds',
      seoDescription: 'Shop durable Nema 24 motors for your next project. Get stable, high-torque performance with options ready for industrial or DIY use.',
      imageUrl: null,
      sortOrder: 7,
      isFeatured: true,
      featuredOrder: 7,
      status: 'active',
    },
  },
  {
    slug: 'nema-34-stepper-motor',
    parentSlug: 'stepper-motor',
    sortOrder: 8,
    featuredOrder: 8,
    fallback: {
      name: 'Nema 34 Stepper Motor',
      slug: 'nema-34-stepper-motor',
      description: '86mm frame heavy-duty stepper motors for maximum torque industrial applications.',
      seoTitle: 'Nema 34 Stepper Motor',
      seoDescription: null,
      imageUrl: null,
      sortOrder: 8,
      isFeatured: true,
      featuredOrder: 8,
      status: 'active',
    },
  },
];

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categorySlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const withoutLeadId = segment.replace(/^\d+-/, '');
  const withoutTailId = withoutLeadId.replace(/-\d+$/, '');
  return normalizeSlug(withoutTailId);
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeName(value: string, maxLength = 150) {
  const decoded = decodeBasicEntities(value.trim());
  return decoded.length <= maxLength ? decoded : `${decoded.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

async function loadSnapshotBySlug(): Promise<Map<string, CategorySnapshot>> {
  const snapshotPath = path.resolve(process.cwd(), '../vexmotor/migration/vexmotor/categories.json');
  const map = new Map<string, CategorySnapshot>();

  try {
    const raw = await readFile(snapshotPath, 'utf8');
    const entries = JSON.parse(raw) as CategorySnapshot[];
    for (const entry of entries) {
      const url = new URL(entry.url);
      const slug = categorySlugFromPath(url.pathname);
      if (!slug || slug === 'machine-human') continue;
      map.set(slug, entry);
    }
  } catch (error) {
    console.warn('未能读取 vexmotor categories.json，将仅使用 manifest 兜底数据:', error);
  }

  return map;
}

async function loadStepmotechCategories(): Promise<Map<string, SourceCategoryRow>> {
  const connectionString = process.env.STEPMOTECH_DATABASE_URL;
  if (!connectionString) {
    console.log('未配置 STEPMOTECH_DATABASE_URL，跳过 Neon 数据源');
    return new Map();
  }

  const sql = postgres(connectionString, { max: 1 });
  try {
    const rows = await sql<{
      name: string;
      slug: string;
      description: string | null;
      seo_title: string | null;
      seo_description: string | null;
      image_url: string | null;
      sort_order: number;
      is_featured: boolean;
      featured_order: number;
      status: 'active' | 'inactive';
    }[]>`
      SELECT name, slug, description, seo_title, seo_description, image_url,
             sort_order, is_featured, featured_order, status
      FROM categories
      WHERE status = 'active'
    `;

    const map = new Map<string, SourceCategoryRow>();
    for (const row of rows) {
      if (row.slug === 'machine-human') continue;
      map.set(row.slug, {
        name: row.name,
        slug: row.slug,
        description: row.description,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        isFeatured: row.is_featured,
        featuredOrder: row.featured_order,
        status: row.status,
      });
    }

    console.log(`从 stepmotech Neon 读取 ${map.size} 条分类`);
    return map;
  } catch (error) {
    console.warn('连接 stepmotech Neon 失败，将使用 manifest + categories.json 兜底:', error);
    return new Map();
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

function mergeCategoryData(
  entry: ManifestEntry,
  neonBySlug: Map<string, SourceCategoryRow>,
  snapshotBySlug: Map<string, CategorySnapshot>,
): SourceCategoryRow {
  const neon = neonBySlug.get(entry.slug);
  const snapshot = snapshotBySlug.get(entry.slug);
  const fallback = entry.fallback;

  const rawSeoTitle = neon?.seoTitle || snapshot?.seoTitle || fallback.seoTitle;
  const rawSeoDescription = neon?.seoDescription || snapshot?.seoDescription || fallback.seoDescription;

  return {
    name: normalizeName(neon?.name || fallback.name),
    slug: entry.slug,
    description: neon?.description || fallback.description,
    seoTitle: normalizeSeoText(rawSeoTitle ? decodeBasicEntities(rawSeoTitle) : null, 70),
    seoDescription: normalizeSeoText(rawSeoDescription ? decodeBasicEntities(rawSeoDescription) : null, 160),
    imageUrl: neon?.imageUrl ?? fallback.imageUrl,
    sortOrder: entry.sortOrder,
    isFeatured: true,
    featuredOrder: entry.featuredOrder,
    status: neon?.status ?? fallback.status,
  };
}

async function findTranslationBySlug(slug: string) {
  const [row] = await db!
    .select({
      translationId: categoryTranslations.id,
      categoryId: categoryTranslations.categoryId,
    })
    .from(categoryTranslations)
    .where(and(eq(categoryTranslations.slug, slug), eq(categoryTranslations.locale, DEFAULT_LOCALE)))
    .limit(1);
  return row ?? null;
}

async function upsertCategory(
  data: SourceCategoryRow,
  parentId: string | null,
): Promise<'created' | 'updated'> {
  const existing = await findTranslationBySlug(data.slug);
  const now = new Date();

  if (existing) {
    await db!.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({
          parentId,
          imageUrl: data.imageUrl,
          status: data.status,
          sortOrder: data.sortOrder,
          isFeatured: data.isFeatured,
          featuredOrder: data.featuredOrder,
          updatedAt: now,
        })
        .where(eq(categories.id, existing.categoryId));

      await tx
        .update(categoryTranslations)
        .set({
          name: data.name,
          slug: data.slug,
          description: data.description,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          updatedAt: now,
        })
        .where(eq(categoryTranslations.id, existing.translationId));
    });
    return 'updated';
  }

  await db!.transaction(async (tx) => {
    const [createdCategory] = await tx
      .insert(categories)
      .values({
        parentId,
        imageUrl: data.imageUrl,
        status: data.status,
        sortOrder: data.sortOrder,
        isFeatured: data.isFeatured,
        featuredOrder: data.featuredOrder,
      })
      .returning({ id: categories.id });

    if (!createdCategory) {
      throw new Error(`Failed to create category: ${data.slug}`);
    }

    await tx.insert(categoryTranslations).values({
      categoryId: createdCategory.id,
      locale: DEFAULT_LOCALE,
      name: data.name,
      slug: data.slug,
      description: data.description,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      payload: { tags: [] },
    });
  });

  return 'created';
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-categories');
  }

  const [neonBySlug, snapshotBySlug] = await Promise.all([
    loadStepmotechCategories(),
    loadSnapshotBySlug(),
  ]);

  const stats = { created: 0, updated: 0 };
  const idBySlug = new Map<string, string>();

  const topLevel = CATEGORY_MANIFEST.filter((entry) => !entry.parentSlug);
  const children = CATEGORY_MANIFEST.filter((entry) => entry.parentSlug);

  for (const entry of topLevel) {
    const data = mergeCategoryData(entry, neonBySlug, snapshotBySlug);
    const result = await upsertCategory(data, null);
    stats[result] += 1;

    const saved = await findTranslationBySlug(entry.slug);
    if (saved) {
      idBySlug.set(entry.slug, saved.categoryId);
    }

    console.log(`${result === 'created' ? '新建' : '更新'}: ${data.name} (${data.slug})`);
  }

  for (const entry of children) {
    const parentId = entry.parentSlug ? idBySlug.get(entry.parentSlug) ?? null : null;
    if (entry.parentSlug && !parentId) {
      throw new Error(`找不到父分类 ${entry.parentSlug}，无法导入 ${entry.slug}`);
    }

    const data = mergeCategoryData(entry, neonBySlug, snapshotBySlug);
    const result = await upsertCategory(data, parentId);
    stats[result] += 1;

    const saved = await findTranslationBySlug(entry.slug);
    if (saved) {
      idBySlug.set(entry.slug, saved.categoryId);
    }

    console.log(`${result === 'created' ? '新建' : '更新'}: ${data.name} (${data.slug}) -> parent ${entry.parentSlug}`);
  }

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(categories);

  console.log('\n导入完成:', {
    created: stats.created,
    updated: stats.updated,
    total: CATEGORY_MANIFEST.length,
    categoriesInDb: Number(countRow?.total ?? 0),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
