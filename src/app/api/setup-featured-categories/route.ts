import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { categories } from '@/server/db/schema';

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

/**
 * 一次性设置推荐类目
 * 访问: /api/setup-featured-categories
 * 注意：只在生产环境首次部署时调用一次
 */
export async function GET() {
  if (!db) {
    return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
  }

  try {
    const results = [];
    let successCount = 0;
    let notFoundCount = 0;

    for (const { slug, order } of featuredCategories) {
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
        results.push({ order, name: updated.name, slug: updated.slug, status: 'success' });
        successCount++;
      } else {
        results.push({ order, slug, status: 'not_found' });
        notFoundCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功设置 ${successCount} 个推荐类目`,
      results,
      stats: {
        success: successCount,
        notFound: notFoundCount,
        total: featuredCategories.length,
      },
    });
  } catch (error) {
    console.error('设置推荐类目失败:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
