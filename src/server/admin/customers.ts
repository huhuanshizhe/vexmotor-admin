import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';

import { md5Hash } from '@/lib/auth/password';
import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import type { CustomerListQuery } from '@/lib/customer-list-query';
import { generateRandomPassword } from '@/lib/random-password';
import { db } from '@/server/db';
import {
  addresses,
  admins,
  customerMessages,
  inquiries,
  orders,
  users,
} from '@/server/db/schema';

export type AdminCustomerListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  industry: string | null;
  companyCountryCode: string | null;
  role: 'customer' | 'staff' | 'admin';
  status: 'active' | 'disabled' | 'pending';
  lastLoginAt: Date | null;
  orderCount: number;
  inquiryCount: number;
  totalSpent: number;
  addressCount: number;
  messageCount: number;
};

export type AdminCustomerDetail = AdminCustomerListItem & {
  avatarUrl: string | null;
  jobTitle: string | null;
  companyState: string | null;
  companyCity: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyPostalCode: string | null;
  website: string | null;
  taxId: string | null;
  companySize: string | null;
  internalNote: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCustomerAddressBookItem = {
  id: string;
  source: 'address_book';
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
  createdAt: Date;
};

export type AdminCustomerOrderAddressItem = {
  id: string;
  source: 'order_snapshot';
  orderNumber: string;
  placedAt: Date | null;
  snapshot: Record<string, unknown>;
};

export type AdminCustomerMessage = {
  id: string;
  userId: string;
  senderType: 'admin' | 'customer';
  adminId: string | null;
  adminName: string | null;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export type AdminCustomerListPage = {
  items: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

export type AdminCustomerCreateInput = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  role?: 'customer' | 'staff' | 'admin';
  password: string;
};

type CustomerAggregates = {
  orderCount: number;
  inquiryCount: number;
  addressCount: number;
  messageCount: number;
  totalSpent: number;
};

function emptyAggregates(): CustomerAggregates {
  return {
    orderCount: 0,
    inquiryCount: 0,
    addressCount: 0,
    messageCount: 0,
    totalSpent: 0,
  };
}

function buildCustomerWhere(query: CustomerListQuery) {
  const filters = [];

  const keyword = query.keyword.trim();
  if (keyword) {
    const pattern = `%${keyword}%`;
    filters.push(or(
      ilike(users.email, pattern),
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
      ilike(users.company, pattern),
      ilike(users.phone, pattern),
    ));
  }

  if (query.status) {
    filters.push(eq(users.status, query.status));
  }

  if (query.role) {
    filters.push(eq(users.role, query.role));
  }

  if (query.industry) {
    filters.push(eq(users.industry, query.industry));
  }

  if (query.country) {
    filters.push(eq(users.companyCountryCode, query.country));
  }

  if (!filters.length) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

async function loadCustomerAggregates(userIds: string[]) {
  const map = new Map<string, CustomerAggregates>();
  if (!userIds.length) return map;

  for (const userId of userIds) {
    map.set(userId, emptyAggregates());
  }

  const [orderRows, inquiryRows, addressRows, messageRows] = await Promise.all([
    db
      .select({
        userId: orders.userId,
        orderCount: count(),
        totalSpent: sql<string>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.totalAmount} else 0 end), 0)`,
      })
      .from(orders)
      .where(inArray(orders.userId, userIds))
      .groupBy(orders.userId),
    db
      .select({ userId: inquiries.userId, inquiryCount: count() })
      .from(inquiries)
      .where(inArray(inquiries.userId, userIds))
      .groupBy(inquiries.userId),
    db
      .select({ userId: addresses.userId, addressCount: count() })
      .from(addresses)
      .where(inArray(addresses.userId, userIds))
      .groupBy(addresses.userId),
    db
      .select({ userId: customerMessages.userId, messageCount: count() })
      .from(customerMessages)
      .where(inArray(customerMessages.userId, userIds))
      .groupBy(customerMessages.userId),
  ]);

  for (const row of orderRows) {
    const current = map.get(row.userId) ?? emptyAggregates();
    current.orderCount = Number(row.orderCount ?? 0);
    current.totalSpent = Number(row.totalSpent ?? 0);
    map.set(row.userId, current);
  }

  for (const row of inquiryRows) {
    if (!row.userId) continue;
    const current = map.get(row.userId) ?? emptyAggregates();
    current.inquiryCount = Number(row.inquiryCount ?? 0);
    map.set(row.userId, current);
  }

  for (const row of addressRows) {
    const current = map.get(row.userId) ?? emptyAggregates();
    current.addressCount = Number(row.addressCount ?? 0);
    map.set(row.userId, current);
  }

  for (const row of messageRows) {
    const current = map.get(row.userId) ?? emptyAggregates();
    current.messageCount = Number(row.messageCount ?? 0);
    map.set(row.userId, current);
  }

  return map;
}

function toListItem(
  row: typeof users.$inferSelect,
  aggregates: CustomerAggregates,
): AdminCustomerListItem {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    phone: row.phone,
    industry: row.industry,
    companyCountryCode: row.companyCountryCode,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    orderCount: aggregates.orderCount,
    inquiryCount: aggregates.inquiryCount,
    totalSpent: aggregates.totalSpent,
    addressCount: aggregates.addressCount,
    messageCount: aggregates.messageCount,
  };
}

function toDetailItem(
  row: typeof users.$inferSelect,
  aggregates: CustomerAggregates,
): AdminCustomerDetail {
  return {
    ...toListItem(row, aggregates),
    avatarUrl: row.avatarUrl,
    jobTitle: row.jobTitle,
    companyState: row.companyState,
    companyCity: row.companyCity,
    companyAddressLine1: row.companyAddressLine1,
    companyAddressLine2: row.companyAddressLine2,
    companyPostalCode: row.companyPostalCode,
    website: row.website,
    taxId: row.taxId,
    companySize: row.companySize,
    internalNote: row.internalNote,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAdminCustomers(query: CustomerListQuery): Promise<AdminCustomerListPage> {
  const page = Math.max(1, query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const whereClause = buildCustomerWhere(query);

  const [totalRow] = await db
    .select({ value: count() })
    .from(users)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const customerRows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  const aggregateMap = await loadCustomerAggregates(customerRows.map((row) => row.id));
  const items = customerRows.map((row) => toListItem(row, aggregateMap.get(row.id) ?? emptyAggregates()));

  return { items, total, page, pageSize };
}

export async function getAdminCustomerDetail(id: string): Promise<AdminCustomerDetail | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return null;

  const aggregateMap = await loadCustomerAggregates([id]);
  return toDetailItem(row, aggregateMap.get(id) ?? emptyAggregates());
}

export async function getAdminCustomerAddresses(id: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;

  const [addressBook, orderSnapshots] = await Promise.all([
    db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, id))
      .orderBy(desc(addresses.isDefault), desc(addresses.updatedAt)),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        placedAt: orders.placedAt,
        snapshot: orders.shippingAddressSnapshot,
      })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.placedAt), desc(orders.createdAt)),
  ]);

  return {
    addressBook: addressBook.map((row): AdminCustomerAddressBookItem => ({
      id: row.id,
      source: 'address_book',
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      phone: row.phone,
      countryCode: row.countryCode,
      state: row.state,
      city: row.city,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      postalCode: row.postalCode,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
    })),
    orderSnapshots: orderSnapshots
      .filter((row) => Object.keys(row.snapshot ?? {}).length > 0)
      .map((row): AdminCustomerOrderAddressItem => ({
      id: row.id,
      source: 'order_snapshot',
      orderNumber: row.orderNumber,
      placedAt: row.placedAt,
      snapshot: row.snapshot,
    })),
  };
}

export async function listCustomerMessages(userId: string): Promise<AdminCustomerMessage[] | null> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const rows = await db
    .select({
      message: customerMessages,
      adminName: admins.name,
    })
    .from(customerMessages)
    .leftJoin(admins, eq(admins.id, customerMessages.adminId))
    .where(eq(customerMessages.userId, userId))
    .orderBy(asc(customerMessages.createdAt));

  return rows.map((row) => ({
    id: row.message.id,
    userId: row.message.userId,
    senderType: row.message.senderType,
    adminId: row.message.adminId,
    adminName: row.adminName,
    body: row.message.body,
    readAt: row.message.readAt,
    createdAt: row.message.createdAt,
  }));
}

export async function sendAdminCustomerMessage(userId: string, adminId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [created] = await db
    .insert(customerMessages)
    .values({
      userId,
      senderType: 'admin',
      adminId,
      body: trimmedBody,
    })
    .returning();

  if (!created) return null;

  const [row] = await db
    .select({
      message: customerMessages,
      adminName: admins.name,
    })
    .from(customerMessages)
    .leftJoin(admins, eq(admins.id, customerMessages.adminId))
    .where(eq(customerMessages.id, created.id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.message.id,
    userId: row.message.userId,
    senderType: row.message.senderType,
    adminId: row.message.adminId,
    adminName: row.adminName,
    body: row.message.body,
    readAt: row.message.readAt,
    createdAt: row.message.createdAt,
  } satisfies AdminCustomerMessage;
}

export async function reviewAdminCustomer(id: string, action: 'approve' | 'reject') {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.status !== 'pending') return null;

  const [updated] = await db
    .update(users)
    .set({
      status: action === 'approve' ? 'active' : 'disabled',
      emailVerifiedAt: action === 'approve' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return null;
  return getAdminCustomerDetail(updated.id);
}

export async function toggleAdminCustomerStatus(id: string, status: 'active' | 'disabled') {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.status === 'pending') return null;

  const [updated] = await db
    .update(users)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return null;
  return getAdminCustomerDetail(updated.id);
}

export async function patchAdminCustomer(
  id: string,
  input: { status?: 'active' | 'disabled'; internalNote?: string | null },
) {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return null;

  if (input.status && existing.status === 'pending') {
    return null;
  }

  const [updated] = await db
    .update(users)
    .set({
      status: input.status,
      internalNote: typeof input.internalNote === 'undefined' ? undefined : input.internalNote,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return null;
  return getAdminCustomerDetail(updated.id);
}

function generateTemporaryPassword(length = 12) {
  return generateRandomPassword(length);
}

export async function resetAdminCustomerPassword(id: string) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return null;

  const temporaryPassword = generateTemporaryPassword();
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: md5Hash(temporaryPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!updated) return null;
  return { temporaryPassword };
}

export async function createAdminCustomer(input: AdminCustomerCreateInput) {
  const [created] = await db
    .insert(users)
    .values({
      email: input.email.trim().toLowerCase(),
      passwordHash: md5Hash(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company ?? null,
      phone: input.phone ?? null,
      role: input.role ?? 'customer',
      status: 'pending',
    })
    .returning();

  if (!created) return null;
  return getAdminCustomerDetail(created.id);
}

/** @deprecated Use listAdminCustomers */
export async function getAdminCustomers() {
  const result = await listAdminCustomers({
    page: 1,
    pageSize: 100,
    keyword: '',
    status: '',
    role: '',
    industry: '',
    country: '',
  });
  return result.items;
}

/** @deprecated Use getAdminCustomerDetail */
export async function getAdminCustomer(id: string) {
  return getAdminCustomerDetail(id);
}