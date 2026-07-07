import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
} from 'drizzle-orm';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import type { InquiryActiveListQuery, InquiryHistoryListQuery } from '@/lib/inquiry-list-query';
import { getVolumePricingForQuantity } from '@/lib/volume-pricing';
import { db } from '@/server/db';
import { admins, inquiries, inquiryMessages, productTranslations, products, users } from '@/server/db/schema';
import { getCommerceConfig } from '@/server/commerce/config';
import { DEFAULT_PRODUCT_LOCALE, productNameSql, productSlugSql } from '@/server/products/resolve-product-translation';
import {
  getInquiryDisplayTitle,
  hasUnsetQuotedUnitPrice,
  isContactInquiry,
  normalizeInquiryQuotedLines,
  type InquiryQuotedLine,
  type InquiryRfqKind,
  type InquiryRfqPayload,
} from '@/lib/inquiry-rfq';
import type { InquirySalesStatus } from '@/lib/inquiry-sales-status';
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
  quoteNumber: string | null;
  status: InquiryStatus;
  salesStatus: InquirySalesStatus;
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
  projectName: string | null;
  inquiryKind: InquiryRfqKind | null;
};

export type AdminInquiryDetail = AdminInquiryListItem & {
  phone: string | null;
  message: string;
  sourcePageUrl: string | null;
  internalNote: string | null;
  handledAt: Date | null;
  handledByEmail: string | null;
  productId: string | null;
  rfqPayload: InquiryRfqPayload | null;
  quotedLines: InquiryQuotedLine[] | null;
  expiresAt: Date | null;
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
  quoteNumber?: string | null;
  status: InquiryStatus;
  salesStatus: InquirySalesStatus;
  awaitingAdmin: boolean;
  queueKind: 'new_inquiry' | 'customer_replied' | null;
  fullName: string;
  email: string;
  company: string | null;
  country: string | null;
  rfqPayload?: InquiryRfqPayload | Record<string, unknown> | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  resolvedAt: Date | null;
  terminatedAt: Date | null;
  productName: string | null;
  productSlug: string | null;
  productSpu: string | null;
}): AdminInquiryListItem {
  const payload = row.rfqPayload as InquiryRfqPayload | null;
  const inquiryKind = payload?.kind ?? (payload?.lines?.length ? 'rfq' : null);
  const displayProductName = row.productName ?? (isContactInquiry(payload) ? 'Contact' : '未知产品');

  return {
    id: row.id,
    quoteNumber: row.quoteNumber ?? null,
    status: row.status,
    salesStatus: row.salesStatus,
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
    productName: displayProductName,
    productSlug: row.productSlug ?? '',
    productSpu: row.productSpu ?? '',
    projectName: getInquiryDisplayTitle(payload, row.productName),
    inquiryKind,
  };
}

const inquiryListSelect = {
  id: inquiries.id,
  quoteNumber: inquiries.quoteNumber,
  status: inquiries.status,
  salesStatus: inquiries.salesStatus,
  awaitingAdmin: inquiries.awaitingAdmin,
  queueKind: inquiries.queueKind,
  fullName: inquiries.fullName,
  email: inquiries.email,
  company: inquiries.company,
  country: inquiries.country,
  rfqPayload: inquiries.rfqPayload,
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

function buildQuotedLineSeeds(
  rfqPayload: InquiryRfqPayload | null,
  quotedLines: InquiryQuotedLine[] | Array<Record<string, unknown>> | null,
): InquiryQuotedLine[] {
  const rfqSeeds = (rfqPayload?.lines ?? [])
    .filter((line) => line.productId || line.spu)
    .map((line) => ({
      productId: line.productId ? String(line.productId) : '',
      spu: line.spu ?? '',
      name: line.name,
      slug: line.slug,
      quantity: Math.max(1, Number(line.quantity) || 1),
      unitPrice: 0,
      currency: 'USD',
      leadTime: '',
      note: line.notes ?? '',
    }));

  const stored = normalizeInquiryQuotedLines(quotedLines);
  if (!stored.length) {
    return rfqSeeds;
  }

  const rfqBySpu = new Map((rfqPayload?.lines ?? []).map((line) => [line.spu, line]));
  return stored.map((line, index) => {
    const rfqLine = rfqBySpu.get(line.spu) ?? rfqPayload?.lines[index];
    return {
      ...line,
      productId: line.productId || String(rfqLine?.productId ?? '').trim(),
      spu: line.spu || rfqLine?.spu || '',
      name: line.name || rfqLine?.name || '',
      slug: line.slug || rfqLine?.slug || '',
      quantity: Math.max(1, Number(rfqLine?.quantity ?? line.quantity) || 1),
      note: line.note || rfqLine?.notes || '',
    };
  }).filter((line) => line.productId || line.spu);
}

type CatalogProductPricing = {
  id: string;
  spu: string;
  price: number;
  currencyCode: string;
};

function pickEnglishProductTranslation<
  T extends { locale: string },
>(translations: T[]): T | undefined {
  if (!translations.length) {
    return undefined;
  }

  return (
    translations.find((row) => row.locale === DEFAULT_PRODUCT_LOCALE)
    ?? translations.find((row) => row.locale.split('-')[0] === DEFAULT_PRODUCT_LOCALE)
    ?? translations[0]
  );
}

async function loadCatalogPricingForQuotedLines(
  seeds: InquiryQuotedLine[],
): Promise<{ byId: Map<string, CatalogProductPricing>; bySpu: Map<string, CatalogProductPricing> }> {
  const productIds = [...new Set(seeds.map((line) => line.productId).filter(Boolean))];
  const spus = [...new Set(seeds.map((line) => line.spu).filter(Boolean))];

  if (!productIds.length && !spus.length) {
    return { byId: new Map(), bySpu: new Map() };
  }

  const productFilters = [
    ...(productIds.length ? [inArray(products.id, productIds)] : []),
    ...(spus.length ? [inArray(products.spu, spus)] : []),
  ];

  const productRows = await db
    .select({
      id: products.id,
      spu: products.spu,
    })
    .from(products)
    .where(productFilters.length === 1 ? productFilters[0]! : or(...productFilters));

  const resolvedProductIds = [...new Set(productRows.map((row) => row.id))];
  if (!resolvedProductIds.length) {
    return { byId: new Map(), bySpu: new Map() };
  }

  const translationRows = await db
    .select({
      productId: productTranslations.productId,
      locale: productTranslations.locale,
      price: productTranslations.price,
      currencyCode: productTranslations.currencyCode,
    })
    .from(productTranslations)
    .where(inArray(productTranslations.productId, resolvedProductIds));

  const translationsByProductId = new Map<string, typeof translationRows>();
  for (const row of translationRows) {
    const bucket = translationsByProductId.get(row.productId) ?? [];
    bucket.push(row);
    translationsByProductId.set(row.productId, bucket);
  }

  const byId = new Map<string, CatalogProductPricing>();
  const bySpu = new Map<string, CatalogProductPricing>();

  for (const product of productRows) {
    const translations = translationsByProductId.get(product.id) ?? [];
    const preferred = pickEnglishProductTranslation(translations);

    if (!preferred) {
      continue;
    }

    const price = Number(preferred.price);
    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }

    const entry: CatalogProductPricing = {
      id: product.id,
      spu: product.spu,
      price,
      currencyCode: preferred.currencyCode ?? 'USD',
    };

    byId.set(product.id, entry);
    bySpu.set(product.spu, entry);
  }

  return { byId, bySpu };
}

function resolveCatalogProductForLine(
  line: InquiryQuotedLine,
  maps: { byId: Map<string, CatalogProductPricing>; bySpu: Map<string, CatalogProductPricing> },
): CatalogProductPricing | null {
  if (line.productId) {
    const byId = maps.byId.get(line.productId);
    if (byId) {
      return byId;
    }
  }

  if (line.spu) {
    return maps.bySpu.get(line.spu) ?? null;
  }

  return null;
}

async function resolveQuotedLinesWithCatalogPricing(
  rfqPayload: InquiryRfqPayload | null,
  quotedLines: InquiryQuotedLine[] | Array<Record<string, unknown>> | null,
): Promise<InquiryQuotedLine[]> {
  const seeds = buildQuotedLineSeeds(rfqPayload, quotedLines);
  if (!seeds.length) {
    return [];
  }

  const needsPricing = seeds.some((line) => hasUnsetQuotedUnitPrice(line));
  if (!needsPricing) {
    return seeds;
  }

  const { byId, bySpu } = await loadCatalogPricingForQuotedLines(seeds);
  const commerceConfig = await getCommerceConfig();

  return seeds.map((line) => {
    if (!hasUnsetQuotedUnitPrice(line)) {
      return line;
    }

    const product = resolveCatalogProductForLine(line, { byId, bySpu });
    if (!product) {
      return line;
    }

    const quantity = Math.max(1, line.quantity);
    const tier = getVolumePricingForQuantity(
      product.price,
      product.currencyCode,
      quantity,
      commerceConfig.volumePricingRules,
    );

    return {
      ...line,
      productId: product.id,
      spu: line.spu || product.spu,
      unitPrice: tier.unitPriceAmount,
      currency: product.currencyCode,
    };
  });
}

export async function listActiveAdminInquiries(query: InquiryActiveListQuery) {
  const whereClause = buildActiveWhere(query);

  const rows = await db
    .select(inquiryListSelect)
    .from(inquiries)
    .leftJoin(products, eq(products.id, inquiries.productId))
    .where(whereClause)
    .orderBy(desc(inquiries.lastMessageAt), desc(inquiries.createdAt));

  return rows.map(mapListRow);
}

export async function listRecentAdminInquiries(limit = 5) {
  const rows = await db
    .select(inquiryListSelect)
    .from(inquiries)
    .leftJoin(products, eq(products.id, inquiries.productId))
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
    .leftJoin(products, eq(products.id, inquiries.productId))
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
      rfqPayload: inquiries.rfqPayload,
      quotedLines: inquiries.quotedLines,
      expiresAt: inquiries.expiresAt,
      handledAt: inquiries.handledAt,
      productId: inquiries.productId,
      handledByEmail: users.email,
    })
    .from(inquiries)
    .leftJoin(products, eq(products.id, inquiries.productId))
    .leftJoin(users, eq(users.id, inquiries.handledBy))
    .where(eq(inquiries.id, id))
    .limit(1);

  if (!row) return null;

  const messages = await loadInquiryMessages(id);
  const rfqPayload = (row.rfqPayload as InquiryRfqPayload | null) ?? null;
  const quotedLines = await resolveQuotedLinesWithCatalogPricing(
    rfqPayload,
    row.quotedLines,
  );

  return {
    ...mapListRow(row),
    phone: row.phone,
    message: row.message,
    sourcePageUrl: row.sourcePageUrl,
    internalNote: row.internalNote,
    handledAt: row.handledAt,
    handledByEmail: row.handledByEmail,
    productId: row.productId,
    rfqPayload,
    quotedLines,
    expiresAt: row.expiresAt,
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
  salesStatus?: InquirySalesStatus;
  internalNote?: string | null;
  handledBy?: string | null;
  quotedLines?: InquiryQuotedLine[] | null;
  expiresAt?: Date | null;
}): Promise<AdminInquiryDetail | null | { error: 'CONTACT_QUOTE_NOT_ALLOWED' }> {
  const nextUpdate: {
    status?: InquiryStatus;
    salesStatus?: InquirySalesStatus;
    internalNote?: string | null;
    handledAt?: Date | null;
    handledBy?: string | null;
    quotedLines?: InquiryQuotedLine[] | null;
    expiresAt?: Date | null;
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

  if (typeof input.salesStatus !== 'undefined') {
    nextUpdate.salesStatus = input.salesStatus;
  }

  if (typeof input.internalNote !== 'undefined') {
    nextUpdate.internalNote = input.internalNote;
  }

  if (typeof input.quotedLines !== 'undefined') {
    const [existing] = await db
      .select({ rfqPayload: inquiries.rfqPayload })
      .from(inquiries)
      .where(eq(inquiries.id, input.id))
      .limit(1);

    const existingPayload = (existing?.rfqPayload as InquiryRfqPayload | null) ?? null;
    if (isContactInquiry(existingPayload) && input.quotedLines?.length) {
      return { error: 'CONTACT_QUOTE_NOT_ALLOWED' };
    }

    const resolvedQuotedLines = input.quotedLines?.length
      ? await resolveQuotedLinesWithCatalogPricing(
          existingPayload,
          input.quotedLines,
        )
      : null;

    nextUpdate.quotedLines = resolvedQuotedLines;
    if (resolvedQuotedLines?.length && typeof input.status === 'undefined') {
      nextUpdate.status = 'quoted';
    }
  }

  if (typeof input.expiresAt !== 'undefined') {
    nextUpdate.expiresAt = input.expiresAt;
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
