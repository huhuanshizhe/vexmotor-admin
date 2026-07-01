import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';

import { parseOrderNote } from '@/lib/order-note';
import type { OrderStatus, PaymentStatus, RefundStatus, RefundType, ReturnType } from '@/lib/order-status';
import { db } from '@/server/db';
import {
  orderActionLogs,
  orderCouponRedemptions,
  orderItems,
  orderRefundRequests,
  orderShipmentItems,
  orderShipments,
  orders,
} from '@/server/db/schema';
import {
  cancelAirwallexPaymentIntent,
  retrieveAirwallexPaymentIntent,
  withAirwallexAuthRetry,
} from '@/server/payments/airwallex/client';
import { getOrderByNumber } from '@/server/storefront/account';
import { enrichOrderItemsWithCoverImages } from '@/server/storefront/order-payment';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const REUSABLE_INTENT_STATUSES = new Set(['REQUIRES_PAYMENT_METHOD', 'REQUIRES_CUSTOMER_ACTION']);

export type StorefrontOrderListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  paymentStatus?: 'all' | PaymentStatus;
  orderStatus?: 'all' | OrderStatus;
};

export type StorefrontOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: string;
  refundStatus: RefundStatus;
  totalAmount: string;
  currencyCode: string;
  paymentMethod: string | null;
  placedAt: Date | null;
  itemCount: number;
};

export type StorefrontOrderListResult = {
  items: StorefrontOrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StorefrontOrderRefundRequestInput = {
  refundType: RefundType;
  returnType: ReturnType;
  reason: string;
  requestedAmount?: string;
};

function normalizePage(page?: number) {
  return Math.max(1, Number(page) || 1);
}

function normalizePageSize(pageSize?: number) {
  const size = Number(pageSize) || DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
}

function buildListFilters(userId: string, query: StorefrontOrderListQuery) {
  const filters: SQL[] = [eq(orders.userId, userId)];

  const keyword = query.q?.trim();
  if (keyword) {
    filters.push(ilike(orders.orderNumber, `%${keyword}%`));
  }

  if (query.paymentStatus && query.paymentStatus !== 'all') {
    filters.push(eq(orders.paymentStatus, query.paymentStatus));
  }

  if (query.orderStatus && query.orderStatus !== 'all') {
    filters.push(eq(orders.status, query.orderStatus));
  }

  return filters;
}

export function getStorefrontOrderCapabilities(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  refundStatus: RefundStatus;
}) {
  const canPay =
    order.paymentStatus === 'unpaid'
    && order.paymentMethod === 'Credit Card'
    && order.status !== 'cancelled';

  const canCancel = order.paymentStatus === 'unpaid' && order.status === 'unpaid';

  const canRequestRefund =
    order.paymentStatus === 'paid'
    && (order.refundStatus === 'none' || order.refundStatus === 'refund_rejected');

  return { canPay, canCancel, canRequestRefund };
}

async function loadStorefrontShipments(orderId: string) {
  const shipmentRows = await db
    .select({
      id: orderShipments.id,
      trackingNumber: orderShipments.trackingNumber,
      shippedAt: orderShipments.shippedAt,
      note: orderShipments.note,
      createdAt: orderShipments.createdAt,
    })
    .from(orderShipments)
    .where(eq(orderShipments.orderId, orderId))
    .orderBy(desc(orderShipments.shippedAt));

  if (!shipmentRows.length) {
    return [];
  }

  const shipmentIds = shipmentRows.map((row) => row.id);
  const itemRows = await db
    .select({
      shipmentId: orderShipmentItems.shipmentId,
      orderItemId: orderShipmentItems.orderItemId,
      quantity: orderShipmentItems.quantity,
      productName: orderItems.productName,
      spu: orderItems.spu,
    })
    .from(orderShipmentItems)
    .innerJoin(orderItems, eq(orderItems.id, orderShipmentItems.orderItemId))
    .where(inArray(orderShipmentItems.shipmentId, shipmentIds));

  const itemsByShipment = new Map<string, Array<{
    orderItemId: string;
    productName: string;
    sku: string;
    quantity: number | null;
  }>>();

  for (const row of itemRows) {
    const list = itemsByShipment.get(row.shipmentId) ?? [];
    list.push({
      orderItemId: row.orderItemId,
      productName: row.productName,
      sku: row.spu,
      quantity: row.quantity,
    });
    itemsByShipment.set(row.shipmentId, list);
  }

  return shipmentRows.map((row) => ({
    id: row.id,
    trackingNumber: row.trackingNumber,
    shippedAt: row.shippedAt,
    note: row.note,
    createdAt: row.createdAt,
    items: itemsByShipment.get(row.id) ?? [],
  }));
}

async function loadLatestStorefrontRefundRequest(orderId: string) {
  const [row] = await db
    .select({
      id: orderRefundRequests.id,
      refundType: orderRefundRequests.refundType,
      returnType: orderRefundRequests.returnType,
      reason: orderRefundRequests.reason,
      requestedAmount: orderRefundRequests.requestedAmount,
      processedAmount: orderRefundRequests.processedAmount,
      processedAt: orderRefundRequests.processedAt,
      createdAt: orderRefundRequests.createdAt,
    })
    .from(orderRefundRequests)
    .where(eq(orderRefundRequests.orderId, orderId))
    .orderBy(desc(orderRefundRequests.createdAt))
    .limit(1);

  if (!row) {
    return null;
  }

  return row;
}

export async function listOrdersForUser(userId: string, query: StorefrontOrderListQuery = {}) {
  const page = normalizePage(query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const offset = (page - 1) * pageSize;
  const filters = buildListFilters(userId, query);
  const whereClause = and(...filters);

  const [totalRow] = await db
    .select({ total: count() })
    .from(orders)
    .where(whereClause);

  const total = Number(totalRow?.total ?? 0);
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      shippingStatus: orders.shippingStatus,
      refundStatus: orders.refundStatus,
      totalAmount: orders.totalAmount,
      currencyCode: orders.currencyCode,
      paymentMethod: orders.paymentMethod,
      placedAt: orders.placedAt,
      itemCount: sql<number>`(
        select count(*)::int
        from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
      )`,
    })
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.placedAt), desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount ?? 0),
    })),
    page,
    pageSize,
    total,
    totalPages,
  } satisfies StorefrontOrderListResult;
}

export async function getStorefrontOrderDetail(userId: string, orderNumber: string, locale?: string | null) {
  const order = await getOrderByNumber(userId, orderNumber);
  if (!order) {
    return null;
  }

  const [itemRows, shipments, couponRows, refundRequest] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(desc(orderItems.createdAt)),
    loadStorefrontShipments(order.id),
    db
      .select({
        id: orderCouponRedemptions.id,
        couponCode: orderCouponRedemptions.couponCode,
        couponName: orderCouponRedemptions.couponName,
        discountType: orderCouponRedemptions.discountType,
        discountValue: orderCouponRedemptions.discountValue,
        discountAmount: orderCouponRedemptions.discountAmount,
        scopeSummary: orderCouponRedemptions.scopeSummary,
      })
      .from(orderCouponRedemptions)
      .where(eq(orderCouponRedemptions.orderId, order.id))
      .limit(1),
    loadLatestStorefrontRefundRequest(order.id),
  ]);

  const items = await enrichOrderItemsWithCoverImages(itemRows, locale);
  const buyerReferences = parseOrderNote(order.customerNote);
  const capabilities = getStorefrontOrderCapabilities(order);

  return {
    ...order,
    items,
    shipments,
    coupon: couponRows[0] ?? null,
    refundRequest,
    buyerReferences,
    ...capabilities,
  };
}

export async function cancelOrderForUser(userId: string, orderNumber: string) {
  const order = await getOrderByNumber(userId, orderNumber);
  if (!order) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  if (order.paymentStatus !== 'unpaid' || order.status !== 'unpaid') {
    return { ok: false as const, code: 'CANNOT_CANCEL' as const };
  }

  if (order.airwallexPaymentIntentId) {
    try {
      const intent = await withAirwallexAuthRetry(() =>
        retrieveAirwallexPaymentIntent(order.airwallexPaymentIntentId!),
      );

      if (
        intent.status !== 'SUCCEEDED'
        && intent.status !== 'CANCELLED'
        && REUSABLE_INTENT_STATUSES.has(intent.status)
      ) {
        await withAirwallexAuthRetry(() =>
          cancelAirwallexPaymentIntent(intent.id, randomUUID()),
        ).catch(() => undefined);
      }
    } catch {
      // Continue cancelling the order even if gateway cancel fails.
    }
  }

  const now = new Date();
  await db
    .update(orders)
    .set({
      status: 'cancelled',
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderActionLogs).values({
    orderId: order.id,
    actionType: 'status_change',
    adminId: null,
    payload: {
      source: 'customer',
      from: order.status,
      to: 'cancelled',
    },
  });

  return {
    ok: true as const,
    orderNumber: order.orderNumber,
    status: 'cancelled' as const,
    paymentStatus: order.paymentStatus,
  };
}

export async function createRefundRequestForUser(
  userId: string,
  orderNumber: string,
  input: StorefrontOrderRefundRequestInput,
) {
  const order = await getOrderByNumber(userId, orderNumber);
  if (!order) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  if (order.paymentStatus !== 'paid') {
    return { ok: false as const, code: 'NOT_PAID' as const };
  }

  if (order.refundStatus !== 'none' && order.refundStatus !== 'refund_rejected') {
    return { ok: false as const, code: 'REFUND_NOT_AVAILABLE' as const };
  }

  if (input.refundType === 'partial_refund') {
    const amount = Number(input.requestedAmount);
    const total = Number(order.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > total) {
      return { ok: false as const, code: 'INVALID_REFUND_AMOUNT' as const };
    }
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { ok: false as const, code: 'REASON_REQUIRED' as const };
  }

  const now = new Date();
  const [refundRequest] = await db
    .insert(orderRefundRequests)
    .values({
      orderId: order.id,
      refundType: input.refundType,
      returnType: input.returnType,
      reason,
      requestedAmount: input.refundType === 'partial_refund' ? input.requestedAmount ?? null : order.totalAmount,
    })
    .returning();

  await db
    .update(orders)
    .set({
      refundStatus: 'pending',
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  return {
    ok: true as const,
    refundStatus: 'pending' as const,
    refundRequest,
  };
}
