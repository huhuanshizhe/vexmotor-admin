import { count, desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { addresses, inquiries, orderItems, orders, products, users, wishlists } from '@/server/db/schema';

import { getStorefrontInquiriesByUser } from './inquiries';

export async function getProfile(userId: string) {
  if (!db) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      company: users.company,
      phone: users.phone,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function getAddressesByUser(userId: string) {
  if (!db) return [];

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
  if (!db) return null;

  if (payload.isDefault) {
    await db.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, userId));
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
  if (!db) return null;

  if (payload.isDefault) {
    await db.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, userId));
  }

  const [updated] = await db
    .update(addresses)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(addresses.id, addressId))
    .returning();

  if (!updated || updated.userId !== userId) {
    return null;
  }

  return updated;
}

export async function deleteAddressForUser(userId: string, addressId: string) {
  if (!db) return null;

  const [deleted] = await db.delete(addresses).where(eq(addresses.id, addressId)).returning();
  if (!deleted || deleted.userId !== userId) {
    return null;
  }

  return deleted;
}

export async function getOrdersByUser(userId: string) {
  if (!db) return [];

  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrderByNumber(userId: string, orderNumber: string) {
  if (!db) return null;

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || order.userId !== userId) {
    return null;
  }

  return order;
}

export async function getOrderDetailByNumber(userId: string, orderNumber: string) {
  if (!db) return null;

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
  if (!db) {
    return { orders: 0, addresses: 0, inquiries: 0, wishlist: 0 };
  }

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

export async function getWishlistByUser(userId: string) {
  if (!db) return [];

  return db
    .select({
      id: wishlists.id,
      createdAt: wishlists.createdAt,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      shortDescription: products.shortDescription,
      purchaseMode: products.purchaseMode,
      price: products.price,
      currencyCode: products.currencyCode,
      stockQuantity: products.stockQuantity,
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));
}
