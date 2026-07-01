import '@/lib/env';

import { eq } from 'drizzle-orm';

import { md5Hash } from '@/lib/auth/password';
import { db } from '@/server/db';
import {
  addresses,
  brandTranslations,
  brands,
  cartItems,
  carts,
  categories,
  categoryTranslations,
  contentBlocks,
  inquiries,
  orderItems,
  orderRefundRequests,
  orders,
  productCategories,
  productImages,
  products,
  productTranslations,
  users,
  wishlists,
} from '@/server/db/schema';

async function main() {
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

  const insertedCategories: Array<{ id: string; slug: string }> = [];

  const categoryDefs = [
    {
      name: 'Nema 17 Stepper Motor',
      slug: 'nema-17-stepper-motor',
      description: 'Compact high-volume motion component family for printers, feeders, and automation fixtures.',
      sortOrder: 1,
    },
    {
      name: 'Nema 23 Stepper Motor',
      slug: 'nema-23-stepper-motor',
      description: 'High torque catalog products for CNC systems and industrial tooling.',
      sortOrder: 2,
    },
    {
      name: 'Stepper Drivers',
      slug: 'stepper-drivers',
      description: 'Controller and drive modules for production-ready motion systems.',
      sortOrder: 3,
    },
    {
      name: 'Power Supplies',
      slug: 'power-supplies',
      description: 'Matched power systems for stable driver and motor performance.',
      sortOrder: 4,
    },
  ];

  for (const def of categoryDefs) {
    const [existing] = await db
      .select({ categoryId: categoryTranslations.categoryId, slug: categoryTranslations.slug })
      .from(categoryTranslations)
      .where(eq(categoryTranslations.slug, def.slug))
      .limit(1);

    if (existing) {
      insertedCategories.push({ id: existing.categoryId, slug: existing.slug });
      continue;
    }

    const [createdCategory] = await db
      .insert(categories)
      .values({ status: 'active', sortOrder: def.sortOrder })
      .returning({ id: categories.id });

    if (!createdCategory) continue;

    await db.insert(categoryTranslations).values({
      categoryId: createdCategory.id,
      locale: 'en',
      name: def.name,
      slug: def.slug,
      description: def.description,
      seoTitle: def.name,
      seoDescription: def.description,
      payload: { tags: [] },
    });

    insertedCategories.push({ id: createdCategory.id, slug: def.slug });
  }

  const allCategories = insertedCategories.length
    ? insertedCategories
    : await db
      .select({ id: categories.id, slug: categoryTranslations.slug })
      .from(categories)
      .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id));

  const existingBrandTranslation = await db
    .select({ brandId: brandTranslations.brandId, slug: brandTranslations.slug })
    .from(brandTranslations)
    .where(eq(brandTranslations.slug, 'lianchuan-motion'))
    .limit(1);

  let mainBrand = existingBrandTranslation[0]
    ? { id: existingBrandTranslation[0].brandId, slug: existingBrandTranslation[0].slug }
    : null;

  if (!mainBrand) {
    const [insertedBrand] = await db
      .insert(brands)
      .values({ status: 'active' })
      .returning({ id: brands.id });

    if (!insertedBrand) {
      throw new Error('Failed to seed brand');
    }

    await db.insert(brandTranslations).values({
      brandId: insertedBrand.id,
      locale: 'en',
      name: 'Lianchuan Motion',
      slug: 'lianchuan-motion',
      description: 'Industrial motion components for modern automation systems.',
      seoTitle: 'Lianchuan Motion',
      seoDescription: 'Industrial motion components for modern automation systems.',
      payload: { tags: [] },
    });

    mainBrand = { id: insertedBrand.id, slug: 'lianchuan-motion' };
  }
  const nema17 = allCategories.find((item) => item.slug === 'nema-17-stepper-motor');
  const nema23 = allCategories.find((item) => item.slug === 'nema-23-stepper-motor');
  const drivers = allCategories.find((item) => item.slug === 'stepper-drivers');

  if (!mainBrand || !nema17 || !nema23 || !drivers) {
    throw new Error('Seed prerequisites are missing');
  }

  const productSeedRows = [
    {
      brandId: mainBrand.id,
      defaultCategoryId: nema17.id,
      name: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
      slug: '17-single-shaft-bipolar-stepper-motor-45ncm',
      spu: 'VXM-17-45NCM',
      shortDescription: '1.8° step angle, 1.5A current, 40mm body, 4-wire.',
      description: 'A catalog-ready Nema 17 motor targeted at compact automation cells, 3D printing assemblies, and precision feeders.',
      purchaseMode: 'buy' as const,
      status: 'active' as const,
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
      spu: 'VXM-23-240NCM',
      shortDescription: '4A current, 82mm body, industrial torque profile for CNC and tooling.',
      description: 'High-torque Nema 23 motor designed for larger industrial axes, tooling automation, and higher load applications.',
      purchaseMode: 'buy' as const,
      status: 'active' as const,
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
      spu: 'VXM-OEM-ASM',
      shortDescription: 'Custom-configured assembly with engineering review and OEM quotation workflow.',
      description: 'A quotation-led configurable motion assembly sold through RFQ rather than instant checkout.',
      purchaseMode: 'inquiry' as const,
      status: 'active' as const,
      price: '0.00',
      currencyCode: 'USD',
      stockQuantity: 0,
      featured: true,
    },
  ];

  const seededProducts: Array<{ id: string; slug: string }> = [];
  for (const row of productSeedRows) {
    const [inserted] = await db
      .insert(products)
      .values({
        brandId: row.brandId,
        defaultCategoryId: row.defaultCategoryId,
        spu: row.spu,
        purchaseMode: row.purchaseMode,
        status: row.status,
        featured: row.featured,
      })
      .onConflictDoNothing({ target: products.spu })
      .returning({ id: products.id });

    const productId = inserted?.id
      ?? (await db.select({ id: products.id }).from(products).where(eq(products.spu, row.spu)).limit(1))[0]?.id;

    if (!productId) {
      continue;
    }

    await db
      .insert(productTranslations)
      .values({
        productId,
        locale: 'en',
        name: row.name,
        slug: row.slug,
        shortDescription: row.shortDescription,
        description: row.description,
        price: row.price,
        compareAtPrice: row.compareAtPrice ?? null,
        currencyCode: row.currencyCode,
        stockQuantity: row.stockQuantity,
        payload: {
          coverUrl: null,
          coverAlt: null,
          gallery: [],
          tags: [],
          attachments: [],
          certifications: [],
        },
      })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: {
          name: row.name,
          slug: row.slug,
          shortDescription: row.shortDescription,
          description: row.description,
          price: row.price,
          compareAtPrice: row.compareAtPrice ?? null,
          currencyCode: row.currencyCode,
          stockQuantity: row.stockQuantity,
          updatedAt: new Date(),
        },
      });

    seededProducts.push({ id: productId, slug: row.slug });
  }

  const allProducts = seededProducts.length
    ? seededProducts
    : await db
      .select({ id: products.id, slug: productTranslations.slug })
      .from(products)
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(eq(productTranslations.locale, 'en'));

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
        status: 'pending_processing',
        paymentStatus: 'paid',
        shippingStatus: 'unshipped',
        refundStatus: 'none',
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
      spu: 'VXM-17-45NCM',
      quantity: 2,
      unitPrice: '23.90',
      subtotal: '47.80',
    });
  }

  const demoRefundOrderNumber = 'LC-DEMO-REFUND-0001';
  const [existingRefundOrder] = await db.select().from(orders).where(eq(orders.orderNumber, demoRefundOrderNumber)).limit(1);
  if (!existingRefundOrder) {
    const [refundCart] = await db
      .insert(carts)
      .values({
        userId: adminUser.id,
        status: 'converted',
        currencyCode: 'USD',
      })
      .returning();

    await db.insert(cartItems).values({
      cartId: refundCart.id,
      productId: p1.id,
      quantity: 1,
      unitPrice: '23.90',
      subtotal: '23.90',
    });

    const [refundOrder] = await db
      .insert(orders)
      .values({
        orderNumber: demoRefundOrderNumber,
        userId: adminUser.id,
        cartId: refundCart.id,
        status: 'shipped',
        paymentStatus: 'paid',
        shippingStatus: 'shipped',
        refundStatus: 'pending',
        currencyCode: 'USD',
        subtotal: '23.90',
        shippingAmount: '12.00',
        taxAmount: '1.91',
        discountAmount: '0.00',
        totalAmount: '37.81',
        shippingMethod: 'Standard',
        paymentMethod: 'Credit Card (Airwallex)',
        customerNote: 'Demo refund request for admin review.',
        shippingAddressSnapshot: address,
        billingAddressSnapshot: address,
        placedAt: new Date(),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: refundOrder.id,
      productId: p1.id,
      productName: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
      spu: 'VXM-17-45NCM',
      quantity: 1,
      unitPrice: '23.90',
      subtotal: '23.90',
    });

    await db.insert(orderRefundRequests).values({
      orderId: refundOrder.id,
      refundType: 'full_refund',
      returnType: 'return_goods',
      reason: 'Demo seeded refund request.',
      requestedAmount: '37.81',
    });
  }

  console.log('Seed complete');
  console.log('Admin login:', 'admin@lianchuan.local / Admin123456');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
