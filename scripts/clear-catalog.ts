import '@/lib/env';

import { sql } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  categories,
  inquiries,
  orderItems,
  products,
} from '@/server/db/schema';

async function countRows(table: typeof products | typeof categories | typeof inquiries | typeof orderItems) {
  const [row] = await db!
    .select({ total: sql<number>`count(*)` })
    .from(table);
  return Number(row?.total ?? 0);
}

async function main() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  const before = {
    products: await countRows(products),
    categories: await countRows(categories),
    inquiries: await countRows(inquiries),
    orderItems: await countRows(orderItems),
  };

  console.log('清空前:', before);

  await db.transaction(async (tx) => {
    // order_items / inquiries 对 products 为 restrict，需先清理
    await tx.delete(inquiries);
    await tx.delete(orderItems);
    await tx.delete(products);
    await tx.delete(categories);
  });

  const after = {
    products: await countRows(products),
    categories: await countRows(categories),
    inquiries: await countRows(inquiries),
    orderItems: await countRows(orderItems),
  };

  console.log('清空后:', after);
  console.log('产品和分类数据已清空，可以重新导入。');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
