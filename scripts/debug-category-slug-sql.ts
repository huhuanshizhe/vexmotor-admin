import '@/lib/env';

import { eq } from 'drizzle-orm';

import { categoryNameSql, categorySlugSql } from '@/server/categories/resolve-category-translation';
import { db } from '@/server/db';
import { categories } from '@/server/db/schema';

async function main() {
  const locale = 'en';
  const query = db
    .select({
      categoryId: categories.id,
      name: categoryNameSql(categories.id, locale),
      slug: categorySlugSql(categories.id, locale),
    })
    .from(categories)
    .where(eq(categories.id, '8dd9c048-9f3b-4808-8773-1736ac203d27'))
    .limit(1);

  const { sql: generatedSql, params } = query.toSQL();
  console.log('SQL:', generatedSql);
  console.log('Params:', params);

  const [row] = await query;
  console.log('Row:', row);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
