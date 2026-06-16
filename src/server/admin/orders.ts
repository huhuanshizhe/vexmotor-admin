import { desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { orderItems, orders, users } from '@/server/db/schema';
import { getMemoryAdminOrderDetail, getMemoryAdminOrders, type OrderStatus, updateMemoryAdminOrder } from '@/server/storefront/cart';

export async function getAdminOrders() {
  if (!db) return getMemoryAdminOrders();

  try {
    return await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        shippingMethod: orders.shippingMethod,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
        customerEmail: users.email,
        customerName: users.firstName,
        customerLastName: users.lastName,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt));
  } catch {
    return getMemoryAdminOrders();
  }
}

export async function getAdminOrderDetail(orderNumber: string) {
  if (!db) return getMemoryAdminOrderDetail(orderNumber);

  try {
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingAmount: orders.shippingAmount,
        taxAmount: orders.taxAmount,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        shippingMethod: orders.shippingMethod,
        customerNote: orders.customerNote,
        shippingAddressSnapshot: orders.shippingAddressSnapshot,
        billingAddressSnapshot: orders.billingAddressSnapshot,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
        customerEmail: users.email,
        customerName: users.firstName,
        customerLastName: users.lastName,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return null;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(desc(orderItems.createdAt));
    return { ...order, items };
  } catch {
    return getMemoryAdminOrderDetail(orderNumber);
  }
}

export async function updateAdminOrder(input: { orderNumber: string; status?: OrderStatus }) {
  if (!db) {
    return updateMemoryAdminOrder(input);
  }

  try {
    const nextUpdate: {
      status?: OrderStatus;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (typeof input.status !== 'undefined') {
      nextUpdate.status = input.status;
    }

    const [updated] = await db
      .update(orders)
      .set(nextUpdate)
      .where(eq(orders.orderNumber, input.orderNumber))
      .returning({ orderNumber: orders.orderNumber });

    if (!updated) {
      return null;
    }

    return getAdminOrderDetail(input.orderNumber);
  } catch {
    return updateMemoryAdminOrder(input);
  }
}
