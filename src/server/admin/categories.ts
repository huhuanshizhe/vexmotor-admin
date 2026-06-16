import { asc, eq } from 'drizzle-orm';

import {
  createMemoryCategory,
  deleteMemoryCategory,
  getMemoryCategory,
  getMemoryProductCountForCategory,
  listMemoryCategories,
  updateMemoryCategory,
} from '@/server/admin/memory-store';
import { db } from '@/server/db';
import { categories, products } from '@/server/db/schema';

export type AdminCategoryRow = {
  id: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'active' | 'inactive';
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCategoryInput = {
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status: 'active' | 'inactive';
  sortOrder?: number;
  isFeatured?: boolean;
  featuredOrder?: number;
};

function mapMemoryCategories(): AdminCategoryRow[] {
  const rows = listMemoryCategories();
  const nameMap = new Map(rows.map((item) => [item.id, item.name]));
  return rows.map((item) => ({
    ...item,
    parentName: item.parentId ? nameMap.get(item.parentId) ?? null : null,
    productCount: getMemoryProductCountForCategory(item.id),
  }));
}

export async function getAdminCategories() {
  if (!db) {
    return mapMemoryCategories();
  }

  try {
    const [categoryRows, productRows] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db.select({ categoryId: products.defaultCategoryId }).from(products),
    ]);

    const nameMap = new Map(categoryRows.map((item) => [item.id, item.name]));
    const productCountMap = new Map<string, number>();
    for (const row of productRows) {
      if (!row.categoryId) {
        continue;
      }

      productCountMap.set(row.categoryId, (productCountMap.get(row.categoryId) ?? 0) + 1);
    }

    return categoryRows.map((item) => ({
      id: item.id,
      parentId: item.parentId,
      parentName: item.parentId ? nameMap.get(item.parentId) ?? null : null,
      name: item.name,
      slug: item.slug,
      description: item.description,
      imageUrl: item.imageUrl,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      status: item.status,
      sortOrder: item.sortOrder,
      isFeatured: item.isFeatured,
      featuredOrder: item.featuredOrder,
      productCount: productCountMap.get(item.id) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch {
    return mapMemoryCategories();
  }
}

export async function getAdminCategoryOptions() {
  const rows = await getAdminCategories();
  return rows.map((item) => ({ value: item.id, label: item.name }));
}

export async function getAdminCategory(id: string) {
  const rows = await getAdminCategories();
  return rows.find((item) => item.id === id) ?? null;
}

export async function createAdminCategory(input: AdminCategoryInput) {
  if (!db) {
    return createMemoryCategory({
      parentId: input.parentId ?? null,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      status: input.status,
      sortOrder: input.sortOrder ?? 0,
      isFeatured: input.isFeatured ?? false,
      featuredOrder: input.featuredOrder ?? 0,
    });
  }

  try {
    const [created] = await db
      .insert(categories)
      .values({
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        status: input.status,
        sortOrder: input.sortOrder ?? 0,
        isFeatured: input.isFeatured ?? false,
        featuredOrder: input.featuredOrder ?? 0,
      })
      .returning();

    return created ?? null;
  } catch {
    return createMemoryCategory({
      parentId: input.parentId ?? null,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      status: input.status,
      sortOrder: input.sortOrder ?? 0,
      isFeatured: input.isFeatured ?? false,
      featuredOrder: input.featuredOrder ?? 0,
    });
  }
}

export async function updateAdminCategory(id: string, input: Partial<AdminCategoryInput>) {
  if (!db) {
    return updateMemoryCategory(id, {
      parentId: input.parentId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      imageUrl: input.imageUrl,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      status: input.status,
      sortOrder: input.sortOrder,
      isFeatured: input.isFeatured,
      featuredOrder: input.featuredOrder,
    });
  }

  try {
    const [updated] = await db
      .update(categories)
      .set({
        parentId: input.parentId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        imageUrl: input.imageUrl,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        status: input.status,
        sortOrder: input.sortOrder,
        isFeatured: input.isFeatured,
        featuredOrder: input.featuredOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return updated ?? null;
  } catch {
    return updateMemoryCategory(id, {
      parentId: input.parentId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      imageUrl: input.imageUrl,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      status: input.status,
      sortOrder: input.sortOrder,
      isFeatured: input.isFeatured,
      featuredOrder: input.featuredOrder,
    });
  }
}

export async function deleteAdminCategory(id: string) {
  if (!db) {
    return deleteMemoryCategory(id);
  }

  try {
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return Boolean(deleted);
  } catch {
    return deleteMemoryCategory(id);
  }
}
