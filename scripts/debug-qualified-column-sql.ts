import '@/lib/env';

import { eq, getTableName } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { db } from '@/server/db';
import { categories } from '@/server/db/schema';

async function main() {
  const outerId = sql.raw(`"${getTableName(categories)}"."${categories.id.name}"`);
  const locale = 'en';

  const query = db
    .select({
      id: categories.id,
      name: sql<string>`COALESCE(
        (SELECT ct.name FROM category_translations ct
          WHERE ct.category_id = ${outerId} AND ct.locale = ${locale} LIMIT 1),
        ''
      )`.as('name'),
    })
    .from(categories)
    .where(eq(categories.id, '8dd9c048-9f3b-4808-8773-1736ac203d27'))
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
