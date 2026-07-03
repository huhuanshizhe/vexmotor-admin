import '@/lib/env';

import { sql } from 'drizzle-orm';

import { db } from '@/server/db';

async function main() {
  const hierarchy = await db.execute<{ slug: string; parent_id: string | null; parent_slug: string | null }>(sql`
    SELECT child.slug, child_cat.parent_id, parent.slug AS parent_slug
    FROM category_translations child
    JOIN categories child_cat ON child_cat.id = child.category_id
    LEFT JOIN categories parent_cat ON parent_cat.id = child_cat.parent_id
    LEFT JOIN category_translations parent ON parent.category_id = parent_cat.id AND parent.locale = 'en'
    WHERE child.locale = 'en'
      AND (child.slug LIKE '%stepper%' OR child.slug LIKE '%nema%' OR child.slug = 'power-supply')
    ORDER BY child.slug
    LIMIT 20
  `);

  const counts = await db.execute<{ category_id: string; slug: string; total: number }>(sql`
    SELECT ct.slug, linked.category_id, count(DISTINCT linked.product_id)::int AS total
    FROM (
      SELECT default_category_id AS category_id, id AS product_id
      FROM products
      WHERE status = 'active' AND default_category_id IS NOT NULL
      UNION
      SELECT category_id, product_id
      FROM product_categories
      INNER JOIN products ON products.id = product_categories.product_id
      WHERE products.status = 'active'
    ) linked
    JOIN category_translations ct ON ct.category_id = linked.category_id AND ct.locale = 'en'
    WHERE ct.slug IN ('stepper-motor', 'nema-17-stepper-motor', 'power-supply')
    GROUP BY ct.slug, linked.category_id
  `);

  const productLinks = await db.execute<{ spu: string; default_slug: string | null; parent_slug: string | null }>(sql`
    SELECT p.spu, ct.slug AS default_slug, parent.slug AS parent_slug
    FROM products p
    LEFT JOIN category_translations ct ON ct.category_id = p.default_category_id AND ct.locale = 'en'
    LEFT JOIN categories c ON c.id = p.default_category_id
    LEFT JOIN category_translations parent ON parent.category_id = c.parent_id AND parent.locale = 'en'
    WHERE p.spu = '17HB19-2504S'
  `);

  const rollup = await db.execute<{ root_slug: string; total: number }>(sql`
    WITH RECURSIVE category_tree AS (
      SELECT id, parent_id, id AS root_id
      FROM categories
      WHERE status = 'active' AND parent_id IS NULL
      UNION ALL
      SELECT child.id, child.parent_id, category_tree.root_id
      FROM categories child
      INNER JOIN category_tree ON child.parent_id = category_tree.id
      WHERE child.status = 'active'
    ),
    product_links AS (
      SELECT category_id, product_id
      FROM (
        SELECT default_category_id AS category_id, id AS product_id
        FROM products
        WHERE status = 'active' AND default_category_id IS NOT NULL
        UNION
        SELECT category_id, product_id
        FROM product_categories
        INNER JOIN products ON products.id = product_categories.product_id
        WHERE products.status = 'active'
      ) linked
      WHERE category_id IS NOT NULL
    )
    SELECT root.slug AS root_slug, count(DISTINCT product_links.product_id)::int AS total
    FROM category_tree
    INNER JOIN category_translations root
      ON root.category_id = category_tree.root_id
      AND root.locale = 'en'
    LEFT JOIN product_links ON product_links.category_id = category_tree.id
    GROUP BY root.slug
    ORDER BY root.slug
  `);

  const translations = await db.execute<{ category_id: string; locale: string; slug: string; name: string }>(sql`
    SELECT category_id, locale, slug, name
    FROM category_translations
    WHERE category_id IN (
      '8dd9c048-9f3b-4808-8773-1736ac203d27',
      '44aecd14-1612-4cbb-827a-4cb22108a91a'
    )
    ORDER BY category_id, locale
  `);

  console.log(JSON.stringify({ translations }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
