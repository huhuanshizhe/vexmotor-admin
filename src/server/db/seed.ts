import '@/lib/env';

import { eq } from 'drizzle-orm';

import { md5Hash } from '@/lib/auth/password';
import { db } from '@/server/db';
import {
  addresses,
  brands,
  cartItems,
  carts,
  categories,
  contentBlocks,
  inquiries,
  orderItems,
  orders,
  productCategories,
  productFeatures,
  productImages,
  products,
  users,
  wishlists,
} from '@/server/db/schema';

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:seed');
  }

  const [existingAdmin] = await db.select().from(users).where(eq(users.email, 'admin@lianchuan.local')).limit(1);
  if (!existingAdmin) {
    await db.insert(users).values({
      email: 'admin@lianchuan.local',
      passwordHash: md5Hash('Admin123456'),
      firstName: 'Site',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    });
  }

  const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@lianchuan.local')).limit(1);
  if (!adminUser) {
    throw new Error('Admin user could not be created');
  }

  const insertedCategories = await db
    .insert(categories)
    .values([
      {
        name: 'Nema 17 Stepper Motor',
        slug: 'nema-17-stepper-motor',
        description: 'Compact high-volume motion component family for printers, feeders, and automation fixtures.',
        status: 'active',
        sortOrder: 1,
      },
      {
        name: 'Nema 23 Stepper Motor',
        slug: 'nema-23-stepper-motor',
        description: 'High torque catalog products for CNC systems and industrial tooling.',
        status: 'active',
        sortOrder: 2,
      },
      {
        name: 'Stepper Drivers',
        slug: 'stepper-drivers',
        description: 'Controller and drive modules for production-ready motion systems.',
        status: 'active',
        sortOrder: 3,
      },
      {
        name: 'Power Supplies',
        slug: 'power-supplies',
        description: 'Matched power systems for stable driver and motor performance.',
        status: 'active',
        sortOrder: 4,
      },
    ])
    .onConflictDoNothing({ target: categories.slug })
    .returning({ id: categories.id, slug: categories.slug });

  const allCategories = insertedCategories.length
    ? insertedCategories
    : await db.select({ id: categories.id, slug: categories.slug }).from(categories);

  const insertedBrands = await db
    .insert(brands)
    .values([
      {
        name: 'Lianchuan Motion',
        slug: 'lianchuan-motion',
        description: 'Industrial motion components for modern automation systems.',
        status: 'active',
      },
    ])
    .onConflictDoNothing({ target: brands.slug })
    .returning({ id: brands.id, slug: brands.slug });

  const allBrands = insertedBrands.length ? insertedBrands : await db.select({ id: brands.id, slug: brands.slug }).from(brands);
  const mainBrand = allBrands.find((item) => item.slug === 'lianchuan-motion');
  const nema17 = allCategories.find((item) => item.slug === 'nema-17-stepper-motor');
  const nema23 = allCategories.find((item) => item.slug === 'nema-23-stepper-motor');
  const drivers = allCategories.find((item) => item.slug === 'stepper-drivers');

  if (!mainBrand || !nema17 || !nema23 || !drivers) {
    throw new Error('Seed prerequisites are missing');
  }

  const insertedProducts = await db
    .insert(products)
    .values([
      {
        brandId: mainBrand.id,
        defaultCategoryId: nema17.id,
        name: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
        slug: '17-single-shaft-bipolar-stepper-motor-45ncm',
        sku: 'VXM-17-45NCM',
        shortDescription: '1.8° step angle, 1.5A current, 40mm body, 4-wire.',
        description: 'A catalog-ready Nema 17 motor targeted at compact automation cells, 3D printing assemblies, and precision feeders.',
        purchaseMode: 'buy',
        status: 'active',
        price: '23.90',
        compareAtPrice: '27.50',
        currencyCode: 'USD',
        stockQuantity: 186,
        featured: true,
      },
      {
        brandId: mainBrand.id,
        defaultCategoryId: nema23.id,
        name: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
        slug: '23-stepper-motor-240ncm',
        sku: 'VXM-23-240NCM',
        shortDescription: '4A current, 82mm body, industrial torque profile for CNC and tooling.',
        description: 'High-torque Nema 23 motor designed for larger industrial axes, tooling automation, and higher load applications.',
        purchaseMode: 'buy',
        status: 'active',
        price: '68.50',
        currencyCode: 'USD',
        stockQuantity: 62,
        featured: true,
      },
      {
        brandId: mainBrand.id,
        defaultCategoryId: drivers.id,
        name: 'Integrated Motion Assembly for OEM Projects',
        slug: 'integrated-motion-assembly-oem',
        sku: 'VXM-OEM-ASM',
        shortDescription: 'Custom-configured assembly with engineering review and OEM quotation workflow.',
        description: 'A quotation-led configurable motion assembly sold through RFQ rather than instant checkout.',
        purchaseMode: 'inquiry',
        status: 'active',
        price: '0.00',
        currencyCode: 'USD',
        stockQuantity: 0,
        featured: true,
      },
    ])
    .onConflictDoNothing({ target: products.slug })
    .returning({ id: products.id, slug: products.slug });

  const allProducts = insertedProducts.length ? insertedProducts : await db.select({ id: products.id, slug: products.slug }).from(products);

  const productBySlug = (slug: string) => {
    const value = allProducts.find((item) => item.slug === slug);
    if (!value) {
      throw new Error(`Missing product ${slug}`);
    }
    return value;
  };

  const p1 = productBySlug('17-single-shaft-bipolar-stepper-motor-45ncm');
  const p2 = productBySlug('23-stepper-motor-240ncm');
  const p3 = productBySlug('integrated-motion-assembly-oem');

  await db
    .insert(productCategories)
    .values([
      { productId: p1.id, categoryId: nema17.id },
      { productId: p2.id, categoryId: nema23.id },
      { productId: p3.id, categoryId: drivers.id },
    ])
    .onConflictDoNothing();

  await db
    .insert(productImages)
    .values([
      {
        productId: p1.id,
        url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80',
        alt: 'Industrial stepper motor close-up',
        width: 1200,
        height: 800,
        sortOrder: 1,
        isPrimary: true,
      },
      {
        productId: p2.id,
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
        alt: 'Industrial automation assembly',
        width: 1200,
        height: 800,
        sortOrder: 1,
        isPrimary: true,
      },
      {
        productId: p3.id,
        url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
        alt: 'Precision engineering prototype',
        width: 1200,
        height: 800,
        sortOrder: 1,
        isPrimary: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(productFeatures)
    .values([
      { productId: p1.id, featureKey: 'Torque', featureValue: '45', unit: 'N·cm', sortOrder: 1 },
      { productId: p1.id, featureKey: 'Current', featureValue: '1.5', unit: 'A', sortOrder: 2 },
      { productId: p2.id, featureKey: 'Torque', featureValue: '240', unit: 'N·cm', sortOrder: 1 },
      { productId: p2.id, featureKey: 'Current', featureValue: '4', unit: 'A', sortOrder: 2 },
      { productId: p3.id, featureKey: 'Workflow', featureValue: 'Inquiry-first', sortOrder: 1 },
    ])
    .onConflictDoNothing();

  await db
    .insert(contentBlocks)
    .values([
      {
        placement: 'home.hero',
        blockKey: 'primary-hero',
        title: 'Stepper motors and drivers for modern automation lines.',
        subtitle: 'Precision Motion Components',
        content: {
          description:
            'Industrial-grade motion systems designed for CNC, robotics, medical devices, and smart manufacturing teams that need stable torque and predictable lead times.',
          primaryAction: { label: 'Browse Product Series', href: '/products' },
          secondaryAction: { label: 'Request a Quote', href: '/contact' },
        },
        status: 'active',
        sortOrder: 1,
      },
      {
        placement: 'home.trust',
        blockKey: 'shipping',
        title: 'Free shipping and duties on orders over $299',
        content: { icon: 'truck' },
        status: 'active',
        sortOrder: 1,
      },
    ])
    .onConflictDoNothing({ target: [contentBlocks.placement, contentBlocks.blockKey] });

  const [existingAddress] = await db.select().from(addresses).where(eq(addresses.userId, adminUser.id)).limit(1);
  const address =
    existingAddress ??
    (
      await db
        .insert(addresses)
        .values({
          userId: adminUser.id,
          firstName: 'Site',
          lastName: 'Admin',
          company: 'Lianchuan Motion',
          phone: '+1-415-555-0102',
          countryCode: 'US',
          state: 'CA',
          city: 'San Jose',
          addressLine1: '101 Demo Industrial Ave',
          addressLine2: 'Suite 200',
          postalCode: '95112',
          isDefault: true,
        })
        .returning()
    )[0];

  await db.insert(wishlists).values({ userId: adminUser.id, productId: p2.id }).onConflictDoNothing();

  const [existingInquiry] = await db.select().from(inquiries).where(eq(inquiries.userId, adminUser.id)).limit(1);
  if (!existingInquiry) {
    await db.insert(inquiries).values({
      productId: p3.id,
      userId: adminUser.id,
      fullName: 'Site Admin',
      email: adminUser.email,
      phone: '+1-415-555-0102',
      company: 'Lianchuan Motion',
      country: 'United States',
      message: 'Need OEM lead time, MOQ, and drawing review for the integrated motion assembly project.',
      status: 'contacted',
      sourcePageUrl: '/products/integrated-motion-assembly-oem',
      handledBy: adminUser.id,
      handledAt: new Date(),
      internalNote: 'Demo RFQ seeded for admin review flow.',
    });
  }

  const demoOrderNumber = 'LC-DEMO-0001';
  const [existingOrder] = await db.select().from(orders).where(eq(orders.orderNumber, demoOrderNumber)).limit(1);
  if (!existingOrder) {
    const [demoCart] = await db
      .insert(carts)
      .values({
        userId: adminUser.id,
        status: 'converted',
        currencyCode: 'USD',
      })
      .returning();

    await db.insert(cartItems).values({
      cartId: demoCart.id,
      productId: p1.id,
      quantity: 2,
      unitPrice: '23.90',
      subtotal: '47.80',
    });

    const [demoOrder] = await db
      .insert(orders)
      .values({
        orderNumber: demoOrderNumber,
        userId: adminUser.id,
        cartId: demoCart.id,
        status: 'processing',
        currencyCode: 'USD',
        subtotal: '47.80',
        shippingAmount: '18.00',
        taxAmount: '3.82',
        discountAmount: '0.00',
        totalAmount: '69.62',
        shippingMethod: 'Express Air',
        paymentMethod: 'Bank Transfer',
        customerNote: 'Demo seeded order for admin operations review.',
        shippingAddressSnapshot: address,
        billingAddressSnapshot: address,
        placedAt: new Date(),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: demoOrder.id,
      productId: p1.id,
      productName: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
      sku: 'VXM-17-45NCM',
      quantity: 2,
      unitPrice: '23.90',
      subtotal: '47.80',
    });
  }

  console.log('Seed complete');
  console.log('Admin login:', 'admin@lianchuan.local / Admin123456');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
