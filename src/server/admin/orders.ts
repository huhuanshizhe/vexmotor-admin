import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import type { OrderHistoryListQuery, OrderPendingListQuery } from '@/lib/order-list-query';
import type {
  OrderActionType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  RefundType,
  ReturnType,
  ShippingStatus,
} from '@/lib/order-status';
import { db } from '@/server/db';
import {
  admins,
  orderActionLogs,
  orderCouponRedemptions,
  orderItems,
  orderRefundRequests,
  orderShipmentItems,
  orderShipments,
  orders,
  users,
} from '@/server/db/schema';

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  refundStatus: RefundStatus;
  totalAmount: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  placedAt: Date | null;
  createdAt: Date;
  customerEmail: string | null;
  customerName: string | null;
  customerLastName: string | null;
  refundType?: RefundType | null;
  returnType?: ReturnType | null;
};

export type AdminOrderShipmentItem = {
  orderItemId: string;
  productName: string;
  spu: string;
  quantity: number | null;
};

export type AdminOrderShipment = {
  id: string;
  trackingNumber: string;
  shippedAt: Date;
  note: string | null;
  adminEmail: string | null;
  createdAt: Date;
  items: AdminOrderShipmentItem[];
};

export type AdminOrderCouponRedemption = {
  id: string;
  couponCode: string;
  couponName: string | null;
  discountType: string;
  discountValue: string;
  discountAmount: string;
  scopeSummary: string | null;
};

export type AdminOrderRefundRequest = {
  id: string;
  refundType: RefundType;
  returnType: ReturnType;
  reason: string | null;
  requestedAmount: string | null;
  processedAmount: string | null;
  processedAt: Date | null;
  processedByEmail: string | null;
  createdAt: Date;
};

export type AdminOrderActionLog = {
  id: string;
  actionType: OrderActionType;
  payload: Record<string, unknown>;
  adminEmail: string | null;
  createdAt: Date;
};

export type AdminOrderItem = {
  id: string;
  productName: string;
  spu: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  refundStatus: RefundStatus;
  subtotal: string;
  shippingAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  customerNote: string | null;
  internalNote: string | null;
  locale: string;
  currencyCode: string;
  shippingAddressSnapshot: Record<string, unknown>;
  billingAddressSnapshot: Record<string, unknown>;
  placedAt: Date | null;
  createdAt: Date;
  terminatedAt: Date | null;
  terminatedByEmail: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerLastName: string | null;
  items: AdminOrderItem[];
  shipments: AdminOrderShipment[];
  couponRedemptions: AdminOrderCouponRedemption[];
  refundRequest: AdminOrderRefundRequest | null;
  actionLogs: AdminOrderActionLog[];
  hasShipments: boolean;
};

export type AdminOrderListPage = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

const orderListSelect = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  status: orders.status,
  paymentStatus: orders.paymentStatus,
  shippingStatus: orders.shippingStatus,
  refundStatus: orders.refundStatus,
  totalAmount: orders.totalAmount,
  paymentMethod: orders.paymentMethod,
  shippingMethod: orders.shippingMethod,
  placedAt: orders.placedAt,
  createdAt: orders.createdAt,
  customerEmail: users.email,
  customerName: users.firstName,
  customerLastName: users.lastName,
};

function buildKeywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(
    ilike(orders.orderNumber, pattern),
    ilike(users.email, pattern),
    ilike(users.firstName, pattern),
    ilike(users.lastName, pattern),
  );
}

function mapListRow(row: {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  refundStatus: RefundStatus;
  totalAmount: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  placedAt: Date | null;
  createdAt: Date;
  customerEmail: string | null;
  customerName: string | null;
  customerLastName: string | null;
  refundType?: RefundType | null;
  returnType?: ReturnType | null;
}): AdminOrderListItem {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    shippingStatus: row.shippingStatus,
    refundStatus: row.refundStatus,
    totalAmount: row.totalAmount,
    paymentMethod: row.paymentMethod,
    shippingMethod: row.shippingMethod,
    placedAt: row.placedAt,
    createdAt: row.createdAt,
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerLastName: row.customerLastName,
    refundType: row.refundType ?? null,
    returnType: row.returnType ?? null,
  };
}

async function appendOrderActionLog(input: {
  orderId: string;
  actionType: OrderActionType;
  adminId: string | null;
  payload?: Record<string, unknown>;
}) {
  await db.insert(orderActionLogs).values({
    orderId: input.orderId,
    actionType: input.actionType,
    adminId: input.adminId,
    payload: input.payload ?? {},
  });
}

async function loadOrderShipments(orderId: string): Promise<AdminOrderShipment[]> {
  const shipmentRows = await db
    .select({
      id: orderShipments.id,
      trackingNumber: orderShipments.trackingNumber,
      shippedAt: orderShipments.shippedAt,
      note: orderShipments.note,
      createdAt: orderShipments.createdAt,
      adminEmail: admins.email,
    })
    .from(orderShipments)
    .leftJoin(admins, eq(admins.id, orderShipments.adminId))
    .where(eq(orderShipments.orderId, orderId))
    .orderBy(desc(orderShipments.shippedAt));

  if (!shipmentRows.length) return [];

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

  const itemsByShipment = new Map<string, AdminOrderShipmentItem[]>();
  for (const row of itemRows) {
    const list = itemsByShipment.get(row.shipmentId) ?? [];
    list.push({
      orderItemId: row.orderItemId,
      productName: row.productName,
      spu: row.spu,
      quantity: row.quantity,
    });
    itemsByShipment.set(row.shipmentId, list);
  }

  return shipmentRows.map((row) => ({
    id: row.id,
    trackingNumber: row.trackingNumber,
    shippedAt: row.shippedAt,
    note: row.note,
    adminEmail: row.adminEmail,
    createdAt: row.createdAt,
    items: itemsByShipment.get(row.id) ?? [],
  }));
}

async function loadOrderActionLogs(orderId: string): Promise<AdminOrderActionLog[]> {
  const rows = await db
    .select({
      id: orderActionLogs.id,
      actionType: orderActionLogs.actionType,
      payload: orderActionLogs.payload,
      createdAt: orderActionLogs.createdAt,
      adminEmail: admins.email,
    })
    .from(orderActionLogs)
    .leftJoin(admins, eq(admins.id, orderActionLogs.adminId))
    .where(eq(orderActionLogs.orderId, orderId))
    .orderBy(desc(orderActionLogs.createdAt));

  return rows.map((row) => ({
    id: row.id,
    actionType: row.actionType,
    payload: row.payload ?? {},
    adminEmail: row.adminEmail,
    createdAt: row.createdAt,
  }));
}

async function loadLatestRefundRequest(orderId: string): Promise<AdminOrderRefundRequest | null> {
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
      processedByEmail: admins.email,
    })
    .from(orderRefundRequests)
    .leftJoin(admins, eq(admins.id, orderRefundRequests.processedBy))
    .where(eq(orderRefundRequests.orderId, orderId))
    .orderBy(desc(orderRefundRequests.createdAt))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    refundType: row.refundType,
    returnType: row.returnType,
    reason: row.reason,
    requestedAmount: row.requestedAmount,
    processedAmount: row.processedAmount,
    processedAt: row.processedAt,
    processedByEmail: row.processedByEmail,
    createdAt: row.createdAt,
  };
}

export async function listPendingAdminOrders(query: OrderPendingListQuery) {
  const filters = [
    eq(orders.status, 'pending_processing'),
    eq(orders.paymentStatus, 'paid'),
  ];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);

  const rows = await db
    .select(orderListSelect)
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(and(...filters))
    .orderBy(desc(orders.placedAt), desc(orders.createdAt));

  return rows.map(mapListRow);
}

async function listPaginatedOrders(
  whereClause: SQL | undefined,
  query: { page: number; pageSize: AdminListPageSize },
  extraSelect?: Record<string, unknown>,
): Promise<AdminOrderListPage> {
  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const offset = (page - 1) * pageSize;

  const baseQuery = db
    .select({
      ...orderListSelect,
      ...(extraSelect ?? {}),
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId));

  const countQuery = db
    .select({ total: count() })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId));

  const [rows, totalRows] = await Promise.all([
    baseQuery
      .where(whereClause)
      .orderBy(desc(orders.placedAt), desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset),
    countQuery.where(whereClause),
  ]);

  return {
    items: rows.map((row) => mapListRow(row as Parameters<typeof mapListRow>[0])),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function listProcessedAdminOrders(query: OrderHistoryListQuery): Promise<AdminOrderListPage> {
  const filters = [
    inArray(orders.status, ['partially_shipped', 'shipped']),
    ne(orders.refundStatus, 'pending'),
  ];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);

  return listPaginatedOrders(and(...filters), query);
}

export async function listRefundAdminOrders(query: OrderHistoryListQuery): Promise<AdminOrderListPage> {
  const filters = [
    eq(orders.refundStatus, 'pending'),
    exists(
      db
        .select({ id: orderRefundRequests.id })
        .from(orderRefundRequests)
        .where(eq(orderRefundRequests.orderId, orders.id)),
    ),
  ];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);

  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        ...orderListSelect,
        refundType: orderRefundRequests.refundType,
        returnType: orderRefundRequests.returnType,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .innerJoin(orderRefundRequests, eq(orderRefundRequests.orderId, orders.id))
      .where(and(...filters))
      .orderBy(desc(orders.placedAt), desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(and(...filters)),
  ]);

  return {
    items: rows.map((row) => mapListRow(row)),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function listHistoryAdminOrders(query: OrderHistoryListQuery): Promise<AdminOrderListPage> {
  const filters = [
    or(
      inArray(orders.status, ['completed', 'cancelled', 'terminated']),
      inArray(orders.refundStatus, ['refunded', 'partially_refunded', 'refund_rejected']),
    ),
  ];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);

  return listPaginatedOrders(and(...filters), query);
}

export async function getAdminOrderDetail(orderNumber: string): Promise<AdminOrderDetail | null> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      shippingStatus: orders.shippingStatus,
      refundStatus: orders.refundStatus,
      subtotal: orders.subtotal,
      shippingAmount: orders.shippingAmount,
      taxAmount: orders.taxAmount,
      discountAmount: orders.discountAmount,
      totalAmount: orders.totalAmount,
      paymentMethod: orders.paymentMethod,
      shippingMethod: orders.shippingMethod,
      customerNote: orders.customerNote,
      internalNote: orders.internalNote,
      locale: orders.locale,
      currencyCode: orders.currencyCode,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      billingAddressSnapshot: orders.billingAddressSnapshot,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      terminatedAt: orders.terminatedAt,
      customerEmail: users.email,
      customerName: users.firstName,
      customerLastName: users.lastName,
      terminatedByEmail: admins.email,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .leftJoin(admins, eq(admins.id, orders.terminatedBy))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) return null;

  const [items, shipments, couponRedemptions, refundRequest, actionLogs, shipmentCount] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        productName: orderItems.productName,
        spu: orderItems.spu,
        variantLabel: orderItems.variantLabel,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(desc(orderItems.createdAt)),
    loadOrderShipments(order.id),
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
      .where(eq(orderCouponRedemptions.orderId, order.id)),
    loadLatestRefundRequest(order.id),
    loadOrderActionLogs(order.id),
    db.select({ total: count() }).from(orderShipments).where(eq(orderShipments.orderId, order.id)),
  ]);

  return {
    ...order,
    items,
    shipments,
    couponRedemptions,
    refundRequest,
    actionLogs,
    hasShipments: Number(shipmentCount[0]?.total ?? 0) > 0,
  };
}

const editableOrderStatuses: OrderStatus[] = ['pending_processing', 'partially_shipped', 'shipped', 'completed'];

export async function updateAdminOrder(input: {
  orderNumber: string;
  status?: OrderStatus;
  internalNote?: string | null;
  adminId: string;
}) {
  const [existing] = await db
    .select({
      id: orders.id,
      status: orders.status,
      internalNote: orders.internalNote,
      shippingStatus: orders.shippingStatus,
    })
    .from(orders)
    .where(eq(orders.orderNumber, input.orderNumber))
    .limit(1);

  if (!existing) return null;

  const now = new Date();
  const nextUpdate: {
    status?: OrderStatus;
    internalNote?: string | null;
    shippingStatus?: ShippingStatus;
    updatedAt: Date;
  } = { updatedAt: now };

  if (typeof input.status !== 'undefined') {
    if (!editableOrderStatuses.includes(input.status)) {
      throw new Error('INVALID_STATUS');
    }
    nextUpdate.status = input.status;
    if (input.status === 'completed') {
      nextUpdate.shippingStatus = 'delivered';
    } else if (input.status === 'partially_shipped' || input.status === 'shipped') {
      const [shipmentRow] = await db
        .select({ total: count() })
        .from(orderShipments)
        .where(eq(orderShipments.orderId, existing.id));
      if (Number(shipmentRow?.total ?? 0) > 0 && existing.shippingStatus === 'unshipped') {
        nextUpdate.shippingStatus = 'shipped';
      }
    }
  }

  if (typeof input.internalNote !== 'undefined') {
    nextUpdate.internalNote = input.internalNote;
  }

  await db.update(orders).set(nextUpdate).where(eq(orders.id, existing.id));

  if (typeof input.status !== 'undefined' && input.status !== existing.status) {
    await appendOrderActionLog({
      orderId: existing.id,
      actionType: input.status === 'completed' ? 'completed' : 'status_change',
      adminId: input.adminId,
      payload: { from: existing.status, to: input.status },
    });
  }

  if (typeof input.internalNote !== 'undefined' && input.internalNote !== existing.internalNote) {
    await appendOrderActionLog({
      orderId: existing.id,
      actionType: 'note_updated',
      adminId: input.adminId,
      payload: { internalNote: input.internalNote },
    });
  }

  return getAdminOrderDetail(input.orderNumber);
}

export async function terminateAdminOrder(orderNumber: string, adminId: string) {
  const [existing] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!existing) return null;
  if (!['pending_processing', 'partially_shipped', 'shipped'].includes(existing.status)) {
    throw new Error('CANNOT_TERMINATE');
  }

  const now = new Date();
  await db
    .update(orders)
    .set({
      status: 'terminated',
      terminatedAt: now,
      terminatedBy: adminId,
      updatedAt: now,
    })
    .where(eq(orders.id, existing.id));

  await appendOrderActionLog({
    orderId: existing.id,
    actionType: 'terminated',
    adminId,
    payload: { from: existing.status },
  });

  return getAdminOrderDetail(orderNumber);
}

export async function addAdminOrderShipment(input: {
  orderNumber: string;
  adminId: string;
  trackingNumber: string;
  shippedAt: Date;
  note?: string | null;
  items?: Array<{ orderItemId: string; quantity?: number | null }>;
}) {
  const [existing] = await db
    .select({ id: orders.id, shippingStatus: orders.shippingStatus })
    .from(orders)
    .where(eq(orders.orderNumber, input.orderNumber))
    .limit(1);

  if (!existing) return null;

  const [shipment] = await db
    .insert(orderShipments)
    .values({
      orderId: existing.id,
      trackingNumber: input.trackingNumber.trim(),
      shippedAt: input.shippedAt,
      note: input.note?.trim() || null,
      adminId: input.adminId,
    })
    .returning();

  if (!shipment) return null;

  if (input.items?.length) {
    await db.insert(orderShipmentItems).values(
      input.items.map((item) => ({
        shipmentId: shipment.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity ?? null,
      })),
    );
  }

  if (existing.shippingStatus === 'unshipped') {
    await db
      .update(orders)
      .set({ shippingStatus: 'shipped', updatedAt: new Date() })
      .where(eq(orders.id, existing.id));
  }

  await appendOrderActionLog({
    orderId: existing.id,
    actionType: 'shipment_added',
    adminId: input.adminId,
    payload: {
      trackingNumber: input.trackingNumber.trim(),
      shippedAt: input.shippedAt.toISOString(),
    },
  });

  return getAdminOrderDetail(input.orderNumber);
}

export async function processAdminOrderRefund(input: {
  orderNumber: string;
  adminId: string;
  refundStatus: 'refunded' | 'partially_refunded' | 'refund_rejected';
  refundedAmount?: string | null;
}) {
  const [existing] = await db
    .select({ id: orders.id, refundStatus: orders.refundStatus, totalAmount: orders.totalAmount })
    .from(orders)
    .where(eq(orders.orderNumber, input.orderNumber))
    .limit(1);

  if (!existing) return null;
  if (existing.refundStatus !== 'pending') {
    throw new Error('REFUND_NOT_PENDING');
  }

  const totalAmount = Number(existing.totalAmount);
  let processedAmount: string | null = null;

  if (input.refundStatus === 'partially_refunded') {
    const amount = Number(input.refundedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_REFUND_AMOUNT');
    }
    if (amount >= totalAmount) {
      throw new Error('REFUND_AMOUNT_TOO_HIGH');
    }
    processedAmount = amount.toFixed(2);
  }

  const now = new Date();
  await db
    .update(orders)
    .set({ refundStatus: input.refundStatus, updatedAt: now })
    .where(eq(orders.id, existing.id));

  await db
    .update(orderRefundRequests)
    .set({
      processedAt: now,
      processedBy: input.adminId,
      processedAmount,
    })
    .where(eq(orderRefundRequests.orderId, existing.id));

  await appendOrderActionLog({
    orderId: existing.id,
    actionType: 'refund_processed',
    adminId: input.adminId,
    payload: {
      refundStatus: input.refundStatus,
      ...(processedAmount ? { refundedAmount: processedAmount } : {}),
    },
  });

  return getAdminOrderDetail(input.orderNumber);
}

/** @deprecated Use listPendingAdminOrders */
export async function getAdminOrders() {
  return listPendingAdminOrders({ keyword: '' });
}
