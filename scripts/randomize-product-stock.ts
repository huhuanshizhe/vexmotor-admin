import '@/lib/env';

import { sql } from 'drizzle-orm';

import { db } from '@/server/db';

async function main() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  const translations = await db.execute<{ id: string }>(sql`
    UPDATE product_translations
    SET stock_quantity = floor(random() * 51 + 100)::int,
        updated_at = now()
    RETURNING id
  `);

  const variants = await db.execute<{ id: string }>(sql`
    UPDATE product_variants
    SET stock_quantity = floor(random() * 51 + 100)::int,
        updated_at = now()
    RETURNING id
  `);

  const inventoryRows = await db.execute<{ id: string }>(sql`
    UPDATE inventory
    SET quantity = floor(random() * 51 + 100)::int,
        available_quantity = GREATEST(floor(random() * 51 + 100)::int - reserved_quantity, 0),
        updated_at = now()
    RETURNING id
  `);

  const statsRows = await db.execute<{ total: number; min_stock: number; max_stock: number }>(sql`
    SELECT
      count(*)::int AS total,
      min(stock_quantity)::int AS min_stock,
      max(stock_quantity)::int AS max_stock
    FROM product_translations
  `);
  const stats = statsRows[0];

  console.log(
    JSON.stringify(
      {
        updatedTranslations: translations.length,
        updatedVariants: variants.length,
        updatedInventory: inventoryRows.length,
        stats,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
