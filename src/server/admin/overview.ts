import { and, count, desc, eq, lte, sql } from 'drizzle-orm';

import { listRecentAdminInquiries } from '@/server/admin/inquiries';
import { listRecentAdminOrders } from '@/server/admin/orders';
import { db } from '@/server/db';
import { brands, categories, cmsPages, inquiries, orders, products, productTranslations, users } from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

export async function getAdminOverview() {
  const [
    productStats,
    categoryStats,
    brandStats,
    customerStats,
    orderStats,
    inquiryStats,
    pageStats,
    recentOrders,
    recentInquiries,
    lowStockItems,
  ] = await Promise.all([
    db.select({ total: count(), active: count(sql`case when ${products.status} = 'active' then 1 end`) }).from(products),
    db.select({ total: count() }).from(categories),
    db.select({ total: count() }).from(brands),
    db
      .select({
        total: count(),
        pending: count(sql`case when ${users.status} = 'pending' then 1 end`),
      })
      .from(users)
      .where(eq(users.role, 'customer')),
    db.select({
      total: count(),
      pending: count(sql`case when ${orders.status} = 'pending_processing' and ${orders.paymentStatus} = 'paid' then 1 end`),
      paidRevenue: sql<number>`coalesce(sum(case
        when ${orders.paymentStatus} = 'paid'
          and ${orders.status} not in ('cancelled', 'terminated')
          and ${orders.refundStatus} <> 'refunded'
        then ${orders.totalAmount}::numeric
        else 0
      end), 0)`,
    }).from(orders),
    db.select({ total: count(), open: count(sql`case when ${inquiries.awaitingAdmin} = true then 1 end`) }).from(inquiries),
    db.select({ published: count(sql`case when ${cmsPages.status} = 'published' then 1 end`) }).from(cmsPages),
    listRecentAdminOrders(5),
    listRecentAdminInquiries(5),
    db
      .select({
        id: products.id,
        name: productTranslations.name,
        spu: products.spu,
        stockQuantity: productTranslations.stockQuantity,
        status: products.status,
      })
      .from(products)
      .innerJoin(
        productTranslations,
        eq(productTranslations.productId, products.id),
      )
      .where(and(
        eq(productTranslations.locale, DEFAULT_PRODUCT_LOCALE),
        eq(products.status, 'active'),
        lte(productTranslations.stockQuantity, 20),
      ))
      .orderBy(productTranslations.stockQuantity, desc(products.updatedAt)),
  ]);

  return {
    metrics: {
      activeProducts: Number(productStats[0]?.active ?? 0),
      totalCategories: Number(categoryStats[0]?.total ?? 0),
      totalBrands: Number(brandStats[0]?.total ?? 0),
      totalCustomers: Number(customerStats[0]?.total ?? 0),
      pendingCustomers: Number(customerStats[0]?.pending ?? 0),
      totalOrders: Number(orderStats[0]?.total ?? 0),
      pendingOrders: Number(orderStats[0]?.pending ?? 0),
      totalInquiries: Number(inquiryStats[0]?.total ?? 0),
      openInquiries: Number(inquiryStats[0]?.open ?? 0),
      lowStockProducts: lowStockItems.length,
      publishedPages: Number(pageStats[0]?.published ?? 0),
      paidRevenue: Number(orderStats[0]?.paidRevenue ?? 0),
    },
    recentOrders,
    recentInquiries,
    lowStockItems: lowStockItems.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      spu: item.spu,
      stockQuantity: item.stockQuantity,
      status: item.status === 'active' ? 'active' as const : 'inactive' as const,
    })),
  };
}
