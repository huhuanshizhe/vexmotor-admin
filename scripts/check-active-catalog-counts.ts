import '@/lib/env';

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/server/db';
import { categories, products } from '@/server/db/schema';

async function main() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  const [activeProductCountRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.status, 'active'));

  const [activeCategoryCountRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.status, 'active'));

  const [activeCategoryWithProductsRow] = await db
    .select({ total: sql<number>`count(distinct ${products.defaultCategoryId})` })
    .from(products)
    .where(and(eq(products.status, 'active'), sql`${products.defaultCategoryId} is not null`));

  console.log(
    JSON.stringify(
      {
        activeProducts: Number(activeProductCountRow?.total ?? 0),
        activeCategories: Number(activeCategoryCountRow?.total ?? 0),
        activeCategoriesWithProducts: Number(activeCategoryWithProductsRow?.total ?? 0),
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
