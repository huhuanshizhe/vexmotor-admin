import { asc, eq } from 'drizzle-orm';

import {
  createMemoryBrand,
  deleteMemoryBrand,
  getMemoryBrand,
  getMemoryProductCountForBrand,
  listMemoryBrands,
  updateMemoryBrand,
} from '@/server/admin/memory-store';
import { db } from '@/server/db';
import { brands, products } from '@/server/db/schema';

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: 'active' | 'inactive';
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminBrandInput = {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  status: 'active' | 'inactive';
};

function mapMemoryBrands(): AdminBrandRow[] {
  return listMemoryBrands().map((item) => ({
    ...item,
    productCount: getMemoryProductCountForBrand(item.id),
  }));
}

export async function getAdminBrands() {
  if (!db) {
    return mapMemoryBrands();
  }

  try {
    const [brandRows, productRows] = await Promise.all([
      db.select().from(brands).orderBy(asc(brands.name)),
      db.select({ brandId: products.brandId }).from(products),
    ]);

    const productCountMap = new Map<string, number>();
    for (const row of productRows) {
      if (!row.brandId) {
        continue;
      }

      productCountMap.set(row.brandId, (productCountMap.get(row.brandId) ?? 0) + 1);
    }

    return brandRows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      logoUrl: item.logoUrl,
      websiteUrl: item.websiteUrl,
      status: item.status,
      productCount: productCountMap.get(item.id) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch {
    return mapMemoryBrands();
  }
}

export async function getAdminBrandOptions() {
  const rows = await getAdminBrands();
  return rows.map((item) => ({ value: item.id, label: item.name }));
}

export async function getAdminBrand(id: string) {
  const rows = await getAdminBrands();
  return rows.find((item) => item.id === id) ?? getMemoryBrand(id);
}

export async function createAdminBrand(input: AdminBrandInput) {
  if (!db) {
    return createMemoryBrand({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      websiteUrl: input.websiteUrl ?? null,
      status: input.status,
    });
  }

  try {
    const [created] = await db
      .insert(brands)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        status: input.status,
      })
      .returning();

    return created ?? null;
  } catch {
    return createMemoryBrand({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      websiteUrl: input.websiteUrl ?? null,
      status: input.status,
    });
  }
}

export async function updateAdminBrand(id: string, input: Partial<AdminBrandInput>) {
  if (!db) {
    return updateMemoryBrand(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logoUrl,
      websiteUrl: input.websiteUrl,
      status: input.status,
    });
  }

  try {
    const [updated] = await db
      .update(brands)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        logoUrl: input.logoUrl,
        websiteUrl: input.websiteUrl,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return updated ?? null;
  } catch {
    return updateMemoryBrand(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logoUrl,
      websiteUrl: input.websiteUrl,
      status: input.status,
    });
  }
}

export async function deleteAdminBrand(id: string) {
  if (!db) {
    return deleteMemoryBrand(id);
  }

  try {
    const [deleted] = await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
    return Boolean(deleted);
  } catch {
    return deleteMemoryBrand(id);
  }
}
