import { asc, eq } from 'drizzle-orm';

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

export async function getAdminBrands() {
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
}

export async function getAdminBrandOptions() {
  const rows = await getAdminBrands();
  return rows.map((item) => ({ value: item.id, label: item.name }));
}

export async function getAdminBrand(id: string) {
  const rows = await getAdminBrands();
  return rows.find((item) => item.id === id) ?? null;
}

export async function createAdminBrand(input: AdminBrandInput) {
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
}

export async function updateAdminBrand(id: string, input: Partial<AdminBrandInput>) {
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
}

export async function deleteAdminBrand(id: string) {
  const [deleted] = await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
  return Boolean(deleted);
}
