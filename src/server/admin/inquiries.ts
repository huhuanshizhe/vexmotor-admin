import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
} from 'drizzle-orm';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import type { InquiryActiveListQuery, InquiryHistoryListQuery } from '@/lib/inquiry-list-query';
import { db } from '@/server/db';
import { admins, inquiries, inquiryMessages, products, users } from '@/server/db/schema';
import { productNameSql, productSlugSql } from '@/server/products/resolve-product-translation';
import type { InquiryStatus } from '@/server/storefront/inquiries';

export type AdminInquiryMessage = {
  id: string;
  inquiryId: string;
  senderType: 'customer' | 'admin';
  adminId: string | null;
  adminName: string | null;
  body: string;
  createdAt: Date;
};

export type AdminInquiryListItem = {
  id: string;
  status: InquiryStatus;
  awaitingAdmin: boolean;
  queueKind: 'new_inquiry' | 'customer_replied' | null;
  fullName: string;
  email: string;
  company: string | null;
  country: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  resolvedAt: Date | null;
  terminatedAt: Date | null;
  productName: string;
  productSlug: string;
  productSpu: string;
};

export type AdminInquiryDetail = AdminInquiryListItem & {
  phone: string | null;
  message: string;
  sourcePageUrl: string | null;
  internalNote: string | null;
  handledAt: Date | null;
  handledByEmail: string | null;
  productId: string;
  messages: AdminInquiryMessage[];
};

export type AdminInquiryHistoryPage = {
  items: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

function buildKeywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(
    ilike(inquiries.fullName, pattern),
    ilike(inquiries.email, pattern),
    ilike(inquiries.company, pattern),
    ilike(inquiries.country, pattern),
    ilike(inquiries.message, pattern),
  );
}

function buildActiveWhere(query: InquiryActiveListQuery) {
  const filters = [eq(inquiries.awaitingAdmin, true)];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);
  if (query.queueKind) filters.push(eq(inquiries.queueKind, query.queueKind));
  if (query.status) filters.push(eq(inquiries.status, query.status));

  return and(...filters);
}

function buildHistoryWhere(query: InquiryHistoryListQuery) {
  const filters = [eq(inquiries.awaitingAdmin, false)];

  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);
  if (query.status) filters.push(eq(inquiries.status, query.status));

  if (query.resolution === 'resolved') {
    filters.push(isNotNull(inquiries.resolvedAt));
  } else if (query.resolution === 'terminated') {
    filters.push(isNotNull(inquiries.terminatedAt));
  } else if (query.resolution === 'replied') {
    filters.push(isNull(inquiries.resolvedAt));
    filters.push(isNull(inquiries.terminatedAt));
  }

  return and(...filters);
}

function mapListRow(row: {
  id: string;
  status: InquiryStatus;
  awaitingAdmin: boolean;
  queueKind: 'new_inquiry' | 'customer_replied' | null;
  fullName: string;
  email: string;
  company: string | null;
  country: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  resolvedAt: Date | null;
  terminatedAt: Date | null;
  productName: string | null;
  productSlug: string | null;
  productSpu: string;
}): AdminInquiryListItem {
  return {
    id: row.id,
    status: row.status,
    awaitingAdmin: row.awaitingAdmin,
    queueKind: row.queueKind,
    fullName: row.fullName,
    email: row.email,
    company: row.company,
    country: row.country,
    createdAt: row.createdAt,
    lastMessageAt: row.lastMessageAt,
    resolvedAt: row.resolvedAt,
    terminatedAt: row.terminatedAt,
    productName: row.productName ?? '未知产品',
    productSlug: row.productSlug ?? '',
    productSpu: row.productSpu,
  };
}

const inquiryListSelect = {
  id: inquiries.id,
  status: inquiries.status,
  awaitingAdmin: inquiries.awaitingAdmin,
  queueKind: inquiries.queueKind,
  fullName: inquiries.fullName,
  email: inquiries.email,
  company: inquiries.company,
  country: inquiries.country,
  createdAt: inquiries.createdAt,
  lastMessageAt: inquiries.lastMessageAt,
  resolvedAt: inquiries.resolvedAt,
  terminatedAt: inquiries.terminatedAt,
  productName: productNameSql(products.id),
  productSlug: productSlugSql(products.id),
  productSpu: products.spu,
};

async function loadInquiryMessages(inquiryId: string): Promise<AdminInquiryMessage[]> {
  const rows = await db
    .select({
      message: inquiryMessages,
      adminName: admins.name,
    })
    .from(inquiryMessages)
    .leftJoin(admins, eq(admins.id, inquiryMessages.adminId))
    .where(eq(inquiryMessages.inquiryId, inquiryId))
    .orderBy(asc(inquiryMessages.createdAt));

  return rows.map((row) => ({
    id: row.message.id,
    inquiryId: row.message.inquiryId,
    senderType: row.message.senderType,
    adminId: row.message.adminId,
    adminName: row.adminName,
    body: row.message.body,
    createdAt: row.message.createdAt,
  }));
}

export async function listActiveAdminInquiries(query: InquiryActiveListQuery) {
  const whereClause = buildActiveWhere(query);

  const rows = await db
    .select(inquiryListSelect)
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .where(whereClause)
    .orderBy(desc(inquiries.lastMessageAt), desc(inquiries.createdAt));

  return rows.map(mapListRow);
}

export async function listRecentAdminInquiries(limit = 5) {
  const rows = await db
    .select(inquiryListSelect)
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .orderBy(desc(inquiries.lastMessageAt), desc(inquiries.createdAt))
    .limit(limit);

  return rows.map(mapListRow);
}

export async function listHistoryAdminInquiries(query: InquiryHistoryListQuery): Promise<AdminInquiryHistoryPage> {
  const page = Math.max(1, query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const whereClause = buildHistoryWhere(query);

  const [totalRow] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select(inquiryListSelect)
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .where(whereClause)
    .orderBy(desc(inquiries.lastMessageAt), desc(inquiries.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map(mapListRow),
    total,
    page,
    pageSize,
  };
}

export async function getAdminInquiryDetail(id: string): Promise<AdminInquiryDetail | null> {
  const [row] = await db
    .select({
      ...inquiryListSelect,
      phone: inquiries.phone,
      message: inquiries.message,
      sourcePageUrl: inquiries.sourcePageUrl,
      internalNote: inquiries.internalNote,
      handledAt: inquiries.handledAt,
      productId: products.id,
      handledByEmail: users.email,
    })
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .leftJoin(users, eq(users.id, inquiries.handledBy))
    .where(eq(inquiries.id, id))
    .limit(1);

  if (!row) return null;

  const messages = await loadInquiryMessages(id);

  return {
    ...mapListRow(row),
    phone: row.phone,
    message: row.message,
    sourcePageUrl: row.sourcePageUrl,
    internalNote: row.internalNote,
    handledAt: row.handledAt,
    handledByEmail: row.handledByEmail,
    productId: row.productId,
    messages,
  };
}

export async function replyAdminInquiry(id: string, adminId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const [existing] = await db.select({ id: inquiries.id, status: inquiries.status }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!existing) return null;

  const now = new Date();
  await db.insert(inquiryMessages).values({
    inquiryId: id,
    senderType: 'admin',
    adminId,
    body: trimmedBody,
  });

  await db
    .update(inquiries)
    .set({
      awaitingAdmin: false,
      queueKind: null,
      lastMessageAt: now,
      status: existing.status === 'new' ? 'contacted' : existing.status,
      handledAt: now,
      updatedAt: now,
    })
    .where(eq(inquiries.id, id));

  return getAdminInquiryDetail(id);
}

export async function terminateAdminInquiry(id: string, adminId: string) {
  const [existing] = await db.select({ id: inquiries.id }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!existing) return null;

  const now = new Date();
  await db
    .update(inquiries)
    .set({
      awaitingAdmin: false,
      queueKind: null,
      terminatedAt: now,
      terminatedBy: adminId,
      updatedAt: now,
    })
    .where(eq(inquiries.id, id));

  return getAdminInquiryDetail(id);
}

export async function updateAdminInquiry(input: {
  id: string;
  status?: InquiryStatus;
  internalNote?: string | null;
  handledBy?: string | null;
}) {
  const nextUpdate: {
    status?: InquiryStatus;
    internalNote?: string | null;
    handledAt?: Date | null;
    handledBy?: string | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (typeof input.status !== 'undefined') {
    nextUpdate.status = input.status;
    if (input.status === 'new') {
      nextUpdate.handledAt = null;
      nextUpdate.handledBy = null;
    } else {
      nextUpdate.handledAt = new Date();
      nextUpdate.handledBy = input.handledBy ?? null;
    }
  }

  if (typeof input.internalNote !== 'undefined') {
    nextUpdate.internalNote = input.internalNote;
  }

  const [updated] = await db
    .update(inquiries)
    .set(nextUpdate)
    .where(eq(inquiries.id, input.id))
    .returning({ id: inquiries.id });

  if (!updated) return null;
  return getAdminInquiryDetail(input.id);
}

/** @deprecated Use listActiveAdminInquiries or listHistoryAdminInquiries */
export async function getAdminInquiries() {
  return listActiveAdminInquiries({ keyword: '', queueKind: '', status: '' });
}
