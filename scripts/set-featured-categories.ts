/**
 * 设置 18 个推荐类目到首页
 * 更新数据库中的 isFeatured 和 featuredOrder 字段
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/server/db';
import { categories } from '../src/server/db/schema';

const featuredCategories = [
  { slug: 'nema-8-stepper-motor', order: 1 },
  { slug: 'nema-11-stepper-motor', order: 2 },
  { slug: 'nema-14-stepper-motor', order: 3 },
  { slug: 'nema-16-stepper-motor', order: 4 },
  { slug: 'nema-17-stepper-motor', order: 5 },
  { slug: 'nema-23-stepper-motor', order: 6 },
  { slug: 'nema-24-stepper-motor', order: 7 },
  { slug: 'nema-34-stepper-motor', order: 8 },
  { slug: 'stepper-motor-driver', order: 9 },
  { slug: 'power-supply', order: 10 },
  { slug: 'closed-loop-stepper-motor', order: 11 },
  { slug: 'brushless-dc-motor', order: 12 },
  { slug: 'brushless-spindle-motor', order: 13 },
  { slug: 'integrated-stepper-motor', order: 14 },
  { slug: 'stepper-motor', order: 15 },
];

async function main() {
  console.log('🚀 开始设置 18 个推荐类目...\n');

  if (!db) {
    console.error('❌ 数据库连接失败');
    process.exit(1);
  }

  let successCount = 0;
  let notFoundCount = 0;

  for (const { slug, order } of featuredCategories) {
    try {
      const [updated] = await db
        .update(categories)
        .set({
          isFeatured: true,
          featuredOrder: order,
          updatedAt: new Date(),
        })
        .where(eq(categories.slug, slug))
        .returning({ id: categories.id, name: categories.name, slug: categories.slug });

      if (updated) {
        console.log(`✅ #${order} ${updated.name} (${slug})`);
        successCount++;
      } else {
        console.log(`⚠️  #${order} 未找到: ${slug}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`❌ #${order} 更新失败 (${slug}):`, error);
    }
  }

  console.log(`\n📊 完成统计:`);
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ⚠️  未找到: ${notFoundCount}`);
  console.log(`  📝 总计: ${featuredCategories.length}`);
}

main().catch(console.error);
