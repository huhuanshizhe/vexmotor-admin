import '@/lib/env';

import { count } from 'drizzle-orm';

import { db } from '@/server/db';
import { brands, categories, cmsPages, contentBlocks, editorialContentEntries, products } from '@/server/db/schema';

async function main() {
  if (!db) {
    throw new Error('db is not available');
  }

  const [brandCount] = await db.select({ value: count() }).from(brands);
  const [categoryCount] = await db.select({ value: count() }).from(categories);
  const [productCount] = await db.select({ value: count() }).from(products);
  const [cmsPageCount] = await db.select({ value: count() }).from(cmsPages);
  const [editorialCount] = await db.select({ value: count() }).from(editorialContentEntries);
  const [contentBlockCount] = await db.select({ value: count() }).from(contentBlocks);

  console.log(
    JSON.stringify(
      {
        brands: brandCount?.value ?? 0,
        categories: categoryCount?.value ?? 0,
        products: productCount?.value ?? 0,
        cmsPages: cmsPageCount?.value ?? 0,
        editorialEntries: editorialCount?.value ?? 0,
        contentBlocks: contentBlockCount?.value ?? 0,
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
