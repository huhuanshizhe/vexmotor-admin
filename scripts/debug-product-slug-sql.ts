import '@/lib/env';

import { eq } from 'drizzle-orm';

import { productNameSql } from '@/server/products/resolve-product-translation';
import { db } from '@/server/db';
import { products } from '@/server/db/schema';

async function main() {
  const query = db
    .select({
      id: products.id,
      name: productNameSql(products.id, 'en'),
    })
    .from(products)
    .where(eq(products.status, 'active'))
    .limit(1);

  const { sql: generatedSql } = query.toSQL();
  console.log('SQL:', generatedSql);

  const [row] = await query;
  console.log('Row:', row);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
