/**
 * VexMotor Core Integration Tests
 * Run with: node --import tsx scripts/test-core.ts
 *
 * Tests the critical data paths against the real database.
 * Requires DATABASE_URL and DB_ENABLE_IN_DEV=true in .env.local.
 */

import '@/lib/env';

import { eq, sql, count, desc } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  brands,
  cartItems,
  carts,
  categories,
  inquiries,
  orders,
  productCategories,
  productFeatures,
  productImages,
  products,
  users,
} from '@/server/db/schema';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

async function testDatabaseConnection() {
  console.log('\n[1] Database Connection');
  assert(db !== null, 'Database client is initialized');

  if (!db) {
    throw new Error('Cannot continue without database');
  }

  const result = await db.execute(sql`SELECT 1 AS value`);
  assert(Array.isArray(result) && result.length > 0, 'Database responds to queries');
}

async function testProductCatalog() {
  console.log('\n[2] Product Catalog');
  if (!db) return;

  const [productCount] = await db.select({ total: count() }).from(products);
  assert((productCount?.total ?? 0) > 0, `Products exist (${productCount?.total ?? 0} found)`);

  const [activeProducts] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.status, 'active'));
  assert((activeProducts?.total ?? 0) > 0, `Active products exist (${activeProducts?.total ?? 0} found)`);

  const [buyProducts] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.purchaseMode, 'buy'));
  assert((buyProducts?.total ?? 0) > 0, `Buy-mode products exist (${buyProducts?.total ?? 0} found)`);

  const [inquiryProducts] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.purchaseMode, 'inquiry'));
  assert((inquiryProducts?.total ?? 0) > 0, `Inquiry-mode products exist (${inquiryProducts?.total ?? 0} found)`);

  // Verify product has images
  const [imageCount] = await db.select({ total: count() }).from(productImages);
  assert((imageCount?.total ?? 0) > 0, `Product images exist (${imageCount?.total ?? 0} found)`);

  // Verify product has features
  const [featureCount] = await db.select({ total: count() }).from(productFeatures);
  assert((featureCount?.total ?? 0) > 0, `Product features exist (${featureCount?.total ?? 0} found)`);

  // Verify product-category relationships
  const [pcCount] = await db.select({ total: count() }).from(productCategories);
  assert((pcCount?.total ?? 0) > 0, `Product-category mappings exist (${pcCount?.total ?? 0} found)`);
}

async function testCategoriesAndBrands() {
  console.log('\n[3] Categories & Brands');
  if (!db) return;

  const [catCount] = await db.select({ total: count() }).from(categories);
  assert((catCount?.total ?? 0) > 0, `Categories exist (${catCount?.total ?? 0} found)`);

  const [activeCats] = await db
    .select({ total: count() })
    .from(categories)
    .where(eq(categories.status, 'active'));
  assert((activeCats?.total ?? 0) > 0, `Active categories exist (${activeCats?.total ?? 0} found)`);

  const [brandCount] = await db.select({ total: count() }).from(brands);
  assert((brandCount?.total ?? 0) > 0, `Brands exist (${brandCount?.total ?? 0} found)`);
}

async function testUserAndAuth() {
  console.log('\n[4] Users & Auth');
  if (!db) return;

  const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@lianchuan.local')).limit(1);
  assert(!!adminUser, 'Admin user exists');
  assert(adminUser?.role === 'admin', 'Admin user has admin role');
  assert(adminUser?.status === 'active', 'Admin user is active');
  assert(!!adminUser?.passwordHash && adminUser.passwordHash.length === 32, 'Admin password hash is MD5 (32 chars)');
}

async function testOrderFlow() {
  console.log('\n[5] Order Flow');
  if (!db) return;

  const [orderCount] = await db.select({ total: count() }).from(orders);
  assert((orderCount?.total ?? 0) > 0, `Orders exist (${orderCount?.total ?? 0} found)`);

  const [demoOrder] = await db.select().from(orders).where(eq(orders.orderNumber, 'LC-DEMO-0001')).limit(1);
  assert(!!demoOrder, 'Demo order exists');
  assert(demoOrder?.status === 'processing', 'Demo order has processing status');
  assert(Number(demoOrder?.totalAmount ?? 0) > 0, 'Demo order has positive total amount');

  // Verify order items
  if (demoOrder) {
    const orderItemRows = await db.select().from(cartItems).where(eq(cartItems.cartId, demoOrder.cartId!));
    assert(orderItemRows.length > 0, `Demo order has cart items (${orderItemRows.length} found)`);
  }
}

async function testInquiryFlow() {
  console.log('\n[6] Inquiry Flow');
  if (!db) return;

  const [inquiryCount] = await db.select({ total: count() }).from(inquiries);
  assert((inquiryCount?.total ?? 0) > 0, `Inquiries exist (${inquiryCount?.total ?? 0} found)`);

  const [demoInquiry] = await db.select().from(inquiries).limit(1);
  assert(!!demoInquiry, 'Demo inquiry exists');
  assert(!!demoInquiry?.productId, 'Inquiry is linked to a product');
  assert(!!demoInquiry?.email, 'Inquiry has contact email');
  assert(['new', 'contacted', 'quoted', 'closed'].includes(demoInquiry?.status ?? ''), 'Inquiry has valid status');
}

async function testDataIntegrity() {
  console.log('\n[7] Data Integrity');
  if (!db) return;

  // Every product should have a valid SKU
  const productsWithEmptySku = await db
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(sql`${products.sku} IS NULL OR ${products.sku} = ''`);
  assert(productsWithEmptySku.length === 0, 'All products have non-empty SKU');

  // Every product image should reference a valid product
  const orphanImages = await db.execute(sql`
    SELECT pi.id FROM product_images pi
    LEFT JOIN products p ON p.id = pi.product_id
    WHERE p.id IS NULL
  `);
  assert((orphanImages as unknown[]).length === 0, 'No orphan product images');

  // Every order should reference a valid user
  const orphanOrders = await db.execute(sql`
    SELECT o.id FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE u.id IS NULL
  `);
  assert((orphanOrders as unknown[]).length === 0, 'No orphan orders');
}

async function testStorefrontQueries() {
  console.log('\n[8] Storefront Query Patterns');
  if (!db) return;

  // Test the same query pattern used by getHomeData
  const featuredProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      price: products.price,
    })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(desc(products.featured))
    .limit(8);
  assert(featuredProducts.length > 0, `Featured product query works (${featuredProducts.length} results)`);

  // Test category with product count (same pattern as category page)
  const categoriesWithCount = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: count(productCategories.productId),
    })
    .from(categories)
    .leftJoin(productCategories, eq(productCategories.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(categories.sortOrder);
  assert(categoriesWithCount.length > 0, `Category with product count query works (${categoriesWithCount.length} categories)`);

  const categoriesWithProducts = categoriesWithCount.filter((c) => c.productCount > 0);
  assert(categoriesWithProducts.length > 0, `Categories with products exist (${categoriesWithProducts.length} found)`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log(' VexMotor Core Integration Tests');
  console.log('═══════════════════════════════════════');

  try {
    await testDatabaseConnection();
    await testProductCatalog();
    await testCategoriesAndBrands();
    await testUserAndAuth();
    await testOrderFlow();
    await testInquiryFlow();
    await testDataIntegrity();
    await testStorefrontQueries();
  } catch (error) {
    console.error('\n[FATAL] Test suite error:', error);
    failed++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach((f) => console.log(`  ✗ ${f}`));
  }

  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
