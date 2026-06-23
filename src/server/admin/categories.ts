import 'server-only';

import { and, asc, count, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import {
  type AdminCategoryListItem,
  type AdminCategoryPayload,
  type AdminCategoryTranslation,
  type AdminCategoryTreeNode,
  type AdminCategoryTreeSearchMatch,
  type CategoryStatus,
  categoryStatuses,
} from '@/lib/category-content';
import { db } from '@/server/db';
import { categories, categoryTranslations, productCategories, products } from '@/server/db/schema';
import { DEFAULT_CATEGORY_LOCALE, categoryNameSql, normalizeCategorySlug } from '@/server/categories/resolve-category-translation';

const payloadSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const adminCategoryTranslationSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  locale: z.string().trim().min(2).default(DEFAULT_CATEGORY_LOCALE),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  status: z.enum(categoryStatuses).optional(),
  sortOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.number().int().optional(),
  payload: payloadSchema.default({ tags: [] }),
});

export const adminCategoryTranslationPatchSchema = adminCategoryTranslationSchema.partial();

export const adminCategoryPatchSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  status: z.enum(categoryStatuses).optional(),
  sortOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.number().int().optional(),
});

export const adminCategoryReorderSchema = z.object({
  moves: z.array(z.object({
    id: z.string().uuid(),
    parentId: z.string().uuid().nullable(),
    sortOrder: z.number().int(),
  })).min(1),
});

type TranslationCreateInput = z.infer<typeof adminCategoryTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminCategoryTranslationPatchSchema>;
type CategoryPatchInput = z.infer<typeof adminCategoryPatchSchema>;

type CategoryRow = typeof categories.$inferSelect;
type TranslationRow = typeof categoryTranslations.$inferSelect;

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSeoText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || DEFAULT_CATEGORY_LOCALE;
}

function normalizePayload(payload: AdminCategoryPayload): AdminCategoryPayload {
  return {
    tags: payload.tags.map((value) => value.trim()).filter(Boolean),
  };
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const normalizedName = input.name.trim();
  const normalizedDescription = normalizeText(input.description);
  const normalizedPayload = normalizePayload(input.payload ?? { tags: [] });
  const normalizedSlug = input.slug?.trim()
    ? normalizeCategorySlug(input.slug)
    : normalizeCategorySlug(normalizedName);

  return {
    name: normalizedName,
    slug: normalizedSlug || `category-${Date.now()}`,
    description: normalizedDescription,
    locale: normalizeLocale(input.locale),
    seoTitle: normalizeSeoText(input.seoTitle ?? normalizedName, 70),
    seoDescription: normalizeSeoText(input.seoDescription ?? normalizedDescription, 160),
    payload: normalizedPayload,
    imageUrl: normalizeText(input.imageUrl),
    parentId: input.parentId ?? null,
    status: input.status ?? 'active' as CategoryStatus,
    sortOrder: input.sortOrder ?? 0,
    isFeatured: input.isFeatured ?? false,
    featuredOrder: input.featuredOrder ?? 0,
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

function normalizeTranslationRow(category: CategoryRow, translation: TranslationRow): AdminCategoryTranslation | null {
  const payload = payloadSchema.safeParse(translation.payload ?? { tags: [] });
  if (!payload.success) return null;

  return {
    id: translation.id,
    categoryId: category.id,
    locale: translation.locale,
    name: translation.name,
    slug: translation.slug,
    description: translation.description,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    status: category.status,
    sortOrder: category.sortOrder,
    isFeatured: category.isFeatured,
    featuredOrder: category.featuredOrder,
    payload: normalizePayload(payload.data),
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(category.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : category.updatedAt.toISOString(),
  };
}

async function loadProductCounts(categoryIds: string[]) {
  const map = new Map<string, number>();
  if (!categoryIds.length) return map;

  const idList = sql.join(categoryIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.execute<{ category_id: string; value: number }>(sql`
    SELECT category_id, count(DISTINCT product_id)::int AS value
    FROM (
      SELECT default_category_id AS category_id, id AS product_id
      FROM products
      WHERE default_category_id IN (${idList})
      UNION
      SELECT category_id, product_id
      FROM product_categories
      WHERE category_id IN (${idList})
    ) AS linked
    WHERE category_id IS NOT NULL
    GROUP BY category_id
  `);

  for (const row of rows) {
    map.set(row.category_id, Number(row.value ?? 0));
  }
  return map;
}

async function loadHasChildrenFlags(categoryIds: string[]) {
  const map = new Map<string, boolean>();
  if (!categoryIds.length) return map;

  const rows = await db
    .select({ parentId: categories.parentId, value: count() })
    .from(categories)
    .where(inArray(categories.parentId, categoryIds))
    .groupBy(categories.parentId);

  for (const row of rows) {
    if (row.parentId) {
      map.set(row.parentId, Number(row.value ?? 0) > 0);
    }
  }
  return map;
}

async function categoryHasLinkedProducts(categoryId: string) {
  const [defaultProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.defaultCategoryId, categoryId))
    .limit(1);
  if (defaultProduct) return true;

  const [linkedProduct] = await db
    .select({ productId: productCategories.productId })
    .from(productCategories)
    .where(eq(productCategories.categoryId, categoryId))
    .limit(1);
  return Boolean(linkedProduct);
}

function toListItem(
  category: CategoryRow,
  translations: TranslationRow[],
  productCount: number,
  hasChildren: boolean,
): AdminCategoryListItem | null {
  const primary = pickPrimaryTranslation(translations);
  if (!primary) return null;

  return {
    id: category.id,
    parentId: category.parentId,
    name: primary.name,
    slug: primary.slug,
    description: primary.description,
    imageUrl: category.imageUrl,
    status: category.status,
    sortOrder: category.sortOrder,
    isFeatured: category.isFeatured,
    featuredOrder: category.featuredOrder,
    productCount,
    hasChildren,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

async function loadTranslationsByCategoryIds(categoryIds: string[]) {
  if (!categoryIds.length) return new Map<string, TranslationRow[]>();

  const rows = await db
    .select()
    .from(categoryTranslations)
    .where(inArray(categoryTranslations.categoryId, categoryIds))
    .orderBy(asc(categoryTranslations.locale));

  const grouped = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.categoryId) ?? [];
    bucket.push(row);
    grouped.set(row.categoryId, bucket);
  }
  return grouped;
}

async function findCategoryIdsBySearch(search: string) {
  const pattern = `%${search.trim()}%`;
  const rows = await db
    .selectDistinct({ categoryId: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .where(or(
      ilike(categoryTranslations.name, pattern),
      ilike(categoryTranslations.slug, pattern),
      ilike(categoryTranslations.description, pattern),
      ilike(categoryTranslations.seoTitle, pattern),
      ilike(categoryTranslations.seoDescription, pattern),
      sql`${categoryTranslations.payload} ->> 'tags' ILIKE ${pattern}`,
    ));

  return rows.map((row) => row.categoryId);
}

async function findCategoryIdsByNameSearch(search: string) {
  const pattern = `%${search.trim()}%`;
  const rows = await db
    .selectDistinct({ categoryId: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .where(ilike(categoryTranslations.name, pattern));

  return rows.map((row) => row.categoryId);
}

export function compareCategoryBySortAndName(
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string },
) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'en');
}

export type { AdminCategoryTreeSearchMatch };

export async function searchAdminCategoryTreeByName(keyword: string): Promise<AdminCategoryTreeSearchMatch[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const matchedIds = await findCategoryIdsByNameSearch(trimmed);
  if (!matchedIds.length) return [];

  const allCategoryRows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
      status: categories.status,
    })
    .from(categories);

  const categoryMap = new Map(allCategoryRows.map((row) => [row.id, row]));
  const translationMap = await loadTranslationsByCategoryIds(allCategoryRows.map((row) => row.id));
  const productCounts = await loadProductCounts(matchedIds);
  const hasChildrenFlags = await loadHasChildrenFlags(matchedIds);

  function resolveName(categoryId: string) {
    const primary = pickPrimaryTranslation(translationMap.get(categoryId) ?? []);
    return primary?.name ?? categoryId;
  }

  function buildPathLabel(categoryId: string) {
    const parts: string[] = [];
    let currentId: string | null = categoryId;
    while (currentId) {
      parts.unshift(resolveName(currentId));
      currentId = categoryMap.get(currentId)?.parentId ?? null;
    }
    return parts.join(' / ');
  }

  const matches = matchedIds
    .map((id) => {
      const category = categoryMap.get(id);
      if (!category) return null;
      const name = resolveName(id);
      return {
        id,
        name,
        parentId: category.parentId,
        pathLabel: buildPathLabel(id),
        sortOrder: category.sortOrder,
        status: category.status,
        productCount: productCounts.get(id) ?? 0,
        hasChildren: hasChildrenFlags.get(id) ?? false,
      } satisfies AdminCategoryTreeSearchMatch;
    })
    .filter((item): item is AdminCategoryTreeSearchMatch => Boolean(item));

  matches.sort(compareCategoryBySortAndName);
  return matches;
}

function buildCategoryTree(
  items: Array<{ id: string; parentId: string | null; name: string; status: CategoryStatus; sortOrder: number }>,
): AdminCategoryTreeNode[] {
  const nodeMap = new Map<string, AdminCategoryTreeNode>();
  for (const item of items) {
    nodeMap.set(item.id, { ...item, children: [], productCount: 0, hasChildren: false });
  }

  const roots: AdminCategoryTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: AdminCategoryTreeNode[]) => {
    nodes.sort(compareCategoryBySortAndName);
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
}

export type AdminCategoryListQuery = {
  parentId?: string | null;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type AdminCategoryListPage = {
  items: AdminCategoryListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

export async function getAdminCategoriesPaginated(
  options: AdminCategoryListQuery = {},
): Promise<AdminCategoryListPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const keyword = options.keyword?.trim() ?? '';
  const parentId = options.parentId === undefined ? null : options.parentId;

  const matchingIds = keyword ? await findCategoryIdsBySearch(keyword) : undefined;
  if (keyword && !matchingIds?.length) {
    return { items: [], total: 0, page, pageSize };
  }

  const parentCondition = parentId
    ? eq(categories.parentId, parentId)
    : isNull(categories.parentId);

  const whereClause = matchingIds?.length
    ? and(parentCondition, inArray(categories.id, matchingIds))
    : parentCondition;

  const [totalRow] = await db
    .select({ value: count() })
    .from(categories)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const categoryRows = await db
    .select()
    .from(categories)
    .where(whereClause)
    .orderBy(asc(categories.sortOrder), asc(categoryNameSql(categories.id)))
    .limit(pageSize)
    .offset(offset);

  const translationMap = await loadTranslationsByCategoryIds(categoryRows.map((row) => row.id));
  const productCounts = await loadProductCounts(categoryRows.map((row) => row.id));
  const hasChildrenFlags = await loadHasChildrenFlags(categoryRows.map((row) => row.id));

  const items = categoryRows
    .map((category) => toListItem(
      category,
      translationMap.get(category.id) ?? [],
      productCounts.get(category.id) ?? 0,
      hasChildrenFlags.get(category.id) ?? false,
    ))
    .filter((item): item is AdminCategoryListItem => Boolean(item));

  return { items, total, page, pageSize };
}

export async function getAdminCategoryTreeLevel(parentId: string | null): Promise<AdminCategoryTreeNode[]> {
  const whereClause = parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId);

  const categoryRows = await db
    .select()
    .from(categories)
    .where(whereClause)
    .orderBy(asc(categories.sortOrder), asc(categoryNameSql(categories.id)));

  if (!categoryRows.length) return [];

  const categoryIds = categoryRows.map((row) => row.id);
  const [translationMap, productCounts, hasChildrenFlags] = await Promise.all([
    loadTranslationsByCategoryIds(categoryIds),
    loadProductCounts(categoryIds),
    loadHasChildrenFlags(categoryIds),
  ]);

  return categoryRows
    .map((category) => {
      const primary = pickPrimaryTranslation(translationMap.get(category.id) ?? []);
      if (!primary) return null;
      return {
        id: category.id,
        parentId: category.parentId,
        name: primary.name,
        status: category.status,
        sortOrder: category.sortOrder,
        productCount: productCounts.get(category.id) ?? 0,
        hasChildren: hasChildrenFlags.get(category.id) ?? false,
        children: [] as AdminCategoryTreeNode[],
      } satisfies AdminCategoryTreeNode;
    })
    .filter((item): item is AdminCategoryTreeNode => Boolean(item));
}

export async function getAdminCategoryTree(): Promise<AdminCategoryTreeNode[]> {
  const categoryRows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categoryNameSql(categories.id)));

  const translationMap = await loadTranslationsByCategoryIds(categoryRows.map((row) => row.id));
  const productCounts = await loadProductCounts(categoryRows.map((row) => row.id));
  const flat = categoryRows
    .map((category) => {
      const primary = pickPrimaryTranslation(translationMap.get(category.id) ?? []);
      if (!primary) return null;
      return {
        id: category.id,
        parentId: category.parentId,
        name: primary.name,
        status: category.status,
        sortOrder: category.sortOrder,
        productCount: productCounts.get(category.id) ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const tree = buildCategoryTree(flat.map(({ productCount: _productCount, ...item }) => item));
  return enrichCategoryTree(tree, productCounts);
}

function enrichCategoryTree(
  nodes: AdminCategoryTreeNode[],
  productCounts: Map<string, number>,
): AdminCategoryTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    productCount: productCounts.get(node.id) ?? 0,
    hasChildren: node.children.length > 0,
    children: enrichCategoryTree(node.children, productCounts),
  }));
}

export async function getAdminCategoryStats() {
  const [totalRow, activeRow] = await Promise.all([
    db.select({ value: count() }).from(categories),
    db.select({ value: count() }).from(categories).where(eq(categories.status, 'active')),
  ]);

  return {
    total: Number(totalRow[0]?.value ?? 0),
    active: Number(activeRow[0]?.value ?? 0),
  };
}

export async function getAdminCategoryOptions() {
  const result = await getAdminCategoriesPaginated({ page: 1, pageSize: 10000 });
  return result.items.map((item) => ({ value: item.id, label: item.name, parentId: item.parentId }));
}

export async function getAdminCategoryListItem(categoryId: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) return null;

  const translations = await db
    .select()
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, categoryId))
    .orderBy(asc(categoryTranslations.locale));

  const productCounts = await loadProductCounts([categoryId]);
  const hasChildrenFlags = await loadHasChildrenFlags([categoryId]);
  return toListItem(
    category,
    translations,
    productCounts.get(categoryId) ?? 0,
    hasChildrenFlags.get(categoryId) ?? false,
  );
}

export async function getAdminCategoryTranslations(categoryId: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) return [];

  const translations = await db
    .select()
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, categoryId))
    .orderBy(asc(categoryTranslations.locale));

  return translations
    .map((translation) => normalizeTranslationRow(category, translation))
    .filter((item): item is AdminCategoryTranslation => Boolean(item));
}

export async function getAdminCategoryTranslation(translationId: string) {
  const [row] = await db
    .select({ category: categories, translation: categoryTranslations })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(eq(categoryTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.category, row.translation) : null;
}

export async function findAdminCategoryTranslationBySlug(
  slug: string,
  locale?: string,
  excludeTranslationId?: string,
) {
  const normalizedSlug = normalizeCategorySlug(slug);
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(categoryTranslations.slug, normalizedSlug),
    eq(categoryTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(categoryTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ category: categories, translation: categoryTranslations })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.category, row.translation) : null;
}

export async function findAdminCategoryTranslationByCategoryAndLocale(
  categoryId: string,
  locale: string,
  excludeTranslationId?: string,
) {
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(categoryTranslations.categoryId, categoryId),
    eq(categoryTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(categoryTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ category: categories, translation: categoryTranslations })
    .from(categoryTranslations)
    .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.category, row.translation) : null;
}

export async function createAdminCategoryTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  if (input.categoryId) {
    const existingLocale = await findAdminCategoryTranslationByCategoryAndLocale(input.categoryId, next.locale);
    if (existingLocale) {
      return updateAdminCategoryTranslation(existingLocale.id, input);
    }
  }

  const categoryId = input.categoryId
    ? input.categoryId
    : (await db
      .insert(categories)
      .values({
        parentId: next.parentId,
        imageUrl: next.imageUrl,
        status: next.status,
        sortOrder: next.sortOrder,
        isFeatured: next.isFeatured,
        featuredOrder: next.featuredOrder,
      })
      .returning({ id: categories.id }))[0]?.id;

  if (!categoryId) return null;

  if (input.categoryId) {
    await db
      .update(categories)
      .set({
        parentId: next.parentId,
        imageUrl: next.imageUrl ?? undefined,
        status: next.status,
        sortOrder: next.sortOrder,
        isFeatured: next.isFeatured,
        featuredOrder: next.featuredOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));
  }

  const [created] = await db
    .insert(categoryTranslations)
    .values({
      categoryId,
      locale: next.locale,
      name: next.name,
      slug: next.slug,
      description: next.description,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      payload: next.payload,
    })
    .returning();

  if (!created) return null;

  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  return category ? normalizeTranslationRow(category, created) : null;
}

export async function updateAdminCategoryTranslation(translationId: string, input: TranslationPatchInput) {
  const current = await getAdminCategoryTranslation(translationId);
  if (!current) return null;

  const merged = sanitizeTranslationInput({
    categoryId: current.categoryId,
    name: input.name ?? current.name,
    slug: input.slug ?? current.slug,
    description: input.description === undefined ? current.description : input.description,
    locale: input.locale ?? current.locale,
    seoTitle: input.seoTitle === undefined ? current.seoTitle : input.seoTitle,
    seoDescription: input.seoDescription === undefined ? current.seoDescription : input.seoDescription,
    imageUrl: input.imageUrl === undefined ? current.imageUrl : input.imageUrl,
    parentId: input.parentId === undefined ? current.parentId : input.parentId,
    status: input.status ?? current.status,
    sortOrder: input.sortOrder ?? current.sortOrder,
    isFeatured: input.isFeatured ?? current.isFeatured,
    featuredOrder: input.featuredOrder ?? current.featuredOrder,
    payload: input.payload ?? current.payload,
  });

  await db
    .update(categories)
    .set({
      parentId: merged.parentId,
      imageUrl: merged.imageUrl,
      status: merged.status,
      sortOrder: merged.sortOrder,
      isFeatured: merged.isFeatured,
      featuredOrder: merged.featuredOrder,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, current.categoryId));

  const [updated] = await db
    .update(categoryTranslations)
    .set({
      name: merged.name,
      slug: merged.slug,
      description: merged.description,
      seoTitle: merged.seoTitle,
      seoDescription: merged.seoDescription,
      payload: merged.payload,
      updatedAt: new Date(),
    })
    .where(eq(categoryTranslations.id, translationId))
    .returning();

  if (!updated) return null;

  const [category] = await db.select().from(categories).where(eq(categories.id, current.categoryId)).limit(1);
  return category ? normalizeTranslationRow(category, updated) : null;
}

export async function updateAdminCategory(categoryId: string, input: CategoryPatchInput) {
  const [updated] = await db
    .update(categories)
    .set({
      parentId: input.parentId,
      imageUrl: input.imageUrl,
      status: input.status,
      sortOrder: input.sortOrder,
      isFeatured: input.isFeatured,
      featuredOrder: input.featuredOrder,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId))
    .returning();

  if (!updated) return null;
  return getAdminCategoryListItem(categoryId);
}

async function getDescendantIds(categoryId: string, allRows: CategoryRow[]) {
  const descendants = new Set<string>();
  const queue = [categoryId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const row of allRows) {
      if (row.parentId === current && !descendants.has(row.id)) {
        descendants.add(row.id);
        queue.push(row.id);
      }
    }
  }
  return descendants;
}

export async function reorderAdminCategories(moves: Array<{ id: string; parentId: string | null; sortOrder: number }>) {
  const allRows = await db.select().from(categories);
  const idSet = new Set(allRows.map((row) => row.id));

  for (const move of moves) {
    if (!idSet.has(move.id)) {
      throw new Error('INVALID_CATEGORY');
    }
    if (move.parentId && !idSet.has(move.parentId)) {
      throw new Error('INVALID_PARENT');
    }
    if (move.parentId) {
      const descendants = await getDescendantIds(move.id, allRows);
      if (descendants.has(move.parentId)) {
        throw new Error('CYCLE_DETECTED');
      }
    }
  }

  await db.transaction(async (tx) => {
    for (const move of moves) {
      await tx
        .update(categories)
        .set({
          parentId: move.parentId,
          sortOrder: move.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, move.id));
    }
  });

  return getAdminCategoryTree();
}

export async function deleteAdminCategory(id: string) {
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id))
    .limit(1);

  if (child) {
    return { ok: false as const, reason: 'HAS_CHILDREN' as const };
  }

  if (await categoryHasLinkedProducts(id)) {
    return { ok: false as const, reason: 'HAS_PRODUCTS' as const };
  }

  const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  return deleted ? { ok: true as const } : { ok: false as const, reason: 'NOT_FOUND' as const };
}

// Legacy alias
export async function getAdminCategories(search?: string) {
  const result = await getAdminCategoriesPaginated({
    keyword: search,
    page: 1,
    pageSize: 10000,
  });
  return result.items;
}

export async function getAdminCategory(id: string) {
  return getAdminCategoryListItem(id);
}

export async function createAdminCategory(input: TranslationCreateInput) {
  return createAdminCategoryTranslation(input);
}

export async function updateAdminCategoryLegacy(id: string, input: TranslationPatchInput) {
  const translations = await getAdminCategoryTranslations(id);
  const primary = translations[0];
  if (!primary) return null;
  return updateAdminCategoryTranslation(primary.id, { ...input, categoryId: id });
}
