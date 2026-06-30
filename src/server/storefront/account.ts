import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { normalizeLocale, type Locale } from '@/lib/i18n';
import { db } from '@/server/db';
import { productCurrencyCodeSql, productNameSql, productPriceSql, productShortDescriptionSql, productSlugSql, productStockQuantitySql } from '@/server/products/resolve-product-translation';
import {
  loadProductTranslationsByProductIds,
  pickProductTranslation,
  resolveProductCoverImage,
} from '@/server/products/load-product-translations';
import { addresses, inquiries, orderItems, orders, productImages, products, users, wishlists } from '@/server/db/schema';

import { getStorefrontInquiriesByUser } from './inquiries';

function profileLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

function formatWishlistMoney(amount: string | number, currencyCode: string) {
  const numeric = Number(amount ?? 0);
  return {
    currency: currencyCode,
    amount: numeric,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(Number.isFinite(numeric) ? numeric : 0),
  };
}

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      jobTitle: users.jobTitle,
      status: users.status,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function updateProfile(
  userId: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    phone: string | null;
    jobTitle: string | null;
  }>,
) {
  const [updated] = await db
    .update(users)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      jobTitle: users.jobTitle,
      status: users.status,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return updated ?? null;
}

export async function getCompanyProfile(userId: string) {
  const [user] = await db
    .select({
      company: users.company,
      industry: users.industry,
      companyCountryCode: users.companyCountryCode,
      companyState: users.companyState,
      companyCity: users.companyCity,
      companyAddressLine1: users.companyAddressLine1,
      companyAddressLine2: users.companyAddressLine2,
      companyPostalCode: users.companyPostalCode,
      website: users.website,
      taxId: users.taxId,
      companySize: users.companySize,
      annualVolumeEstimate: users.annualVolumeEstimate,
      verificationDocuments: users.verificationDocuments,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function updateCompanyProfile(
  userId: string,
  payload: Partial<{
    company: string | null;
    industry: string | null;
    companyCountryCode: string | null;
    companyState: string | null;
    companyCity: string | null;
    companyAddressLine1: string | null;
    companyAddressLine2: string | null;
    companyPostalCode: string | null;
    website: string | null;
    taxId: string | null;
    companySize: string | null;
    annualVolumeEstimate: string | null;
  }>,
) {
  const [updated] = await db
    .update(users)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      company: users.company,
      industry: users.industry,
      companyCountryCode: users.companyCountryCode,
      companyState: users.companyState,
      companyCity: users.companyCity,
      companyAddressLine1: users.companyAddressLine1,
      companyAddressLine2: users.companyAddressLine2,
      companyPostalCode: users.companyPostalCode,
      website: users.website,
      taxId: users.taxId,
      companySize: users.companySize,
      annualVolumeEstimate: users.annualVolumeEstimate,
      verificationDocuments: users.verificationDocuments,
    });

  return updated ?? null;
}

export async function getAddressesByUser(userId: string) {
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault), desc(addresses.updatedAt));
}

export async function createAddressForUser(
  userId: string,
  payload: {
    firstName: string;
    lastName: string;
    company?: string | null;
    phone?: string | null;
    countryCode: string;
    state?: string | null;
    city: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    isDefault?: boolean;
  },
) {
  if (payload.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
  }

  const [created] = await db
    .insert(addresses)
    .values({
      userId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      company: payload.company ?? null,
      phone: payload.phone ?? null,
      countryCode: payload.countryCode,
      state: payload.state ?? null,
      city: payload.city,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? null,
      postalCode: payload.postalCode,
      isDefault: payload.isDefault ?? false,
    })
    .returning();

  return created ?? null;
}

export async function updateAddressForUser(
  userId: string,
  addressId: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    company: string | null;
    phone: string | null;
    countryCode: string;
    state: string | null;
    city: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    isDefault: boolean;
  }>,
) {
  const [existing] = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
  if (!existing || existing.userId !== userId) {
    return null;
  }

  if (payload.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
  }

  const { addressType: _removed, ...rest } = payload as typeof payload & { addressType?: unknown };
  const [updated] = await db
    .update(addresses)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(addresses.id, addressId))
    .returning();

  return updated ?? null;
}

export async function deleteAddressForUser(userId: string, addressId: string) {
  const [deleted] = await db.delete(addresses).where(eq(addresses.id, addressId)).returning();
  if (!deleted || deleted.userId !== userId) {
    return null;
  }

  return deleted;
}

export async function getOrdersByUser(userId: string) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrderByNumber(userId: string, orderNumber: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || order.userId !== userId) {
    return null;
  }

  return order;
}

export async function getOrderDetailByNumber(userId: string, orderNumber: string) {
  const order = await getOrderByNumber(userId, orderNumber);
  if (!order) {
    return null;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(desc(orderItems.createdAt));

  return {
    ...order,
    items,
  };
}

export async function getAccountSummary(userId: string) {
  const [orderCount] = await db.select({ total: count() }).from(orders).where(eq(orders.userId, userId));
  const [addressCount] = await db.select({ total: count() }).from(addresses).where(eq(addresses.userId, userId));
  const [inquiryCount] = await db.select({ total: count() }).from(inquiries).where(eq(inquiries.userId, userId));
  const [wishlistCount] = await db.select({ total: count() }).from(wishlists).where(eq(wishlists.userId, userId));

  return {
    orders: Number(orderCount?.total ?? 0),
    addresses: Number(addressCount?.total ?? 0),
    inquiries: Number(inquiryCount?.total ?? 0),
    wishlist: Number(wishlistCount?.total ?? 0),
  };
}

export async function getInquiriesByUser(userId: string) {
  return getStorefrontInquiriesByUser(userId);
}

export async function getWishlistByUser(userId: string, localeInput?: string | null) {
  const locale = profileLocale(localeInput);
  const rows = await db
    .select({
      id: wishlists.id,
      createdAt: wishlists.createdAt,
      productId: products.id,
      name: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      shortDescription: productShortDescriptionSql(products.id, locale),
      purchaseMode: products.purchaseMode,
      price: productPriceSql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      stockQuantity: productStockQuantitySql(products.id, locale),
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));

  const productIds = rows.map((row) => row.productId);
  const imageRows = productIds.length
    ? await db
        .select({
          productId: productImages.productId,
          id: productImages.id,
          url: productImages.url,
          alt: productImages.alt,
          width: productImages.width,
          height: productImages.height,
        })
        .from(productImages)
        .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, productIds)))
    : [];
  const tableImageByProductId = new Map(
    imageRows.map((row) => [
      row.productId,
      {
        id: row.id,
        url: row.url,
        alt: row.alt,
        width: row.width,
        height: row.height,
      },
    ]),
  );
  const translationsByProductId = await loadProductTranslationsByProductIds(productIds);

  return rows.map((row) => {
    const translation = pickProductTranslation(translationsByProductId.get(row.productId), locale);
    const coverImage = resolveProductCoverImage(
      row.productId,
      row.name,
      tableImageByProductId.get(row.productId),
      translation?.payload,
    );

    return {
      ...row,
      price: formatWishlistMoney(row.price, row.currencyCode),
      inStock: row.stockQuantity > 0,
      coverImage,
    };
  });
}
