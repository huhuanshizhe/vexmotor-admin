import { randomUUID } from 'node:crypto';

import { and, asc, count, desc, eq, gt, ilike } from 'drizzle-orm';

import {
  type InquiryQuotedLine,
  type InquiryRfqPayload,
  buildRfqMessageTextAsync,
  summarizeQuotedValue,
} from '@/lib/inquiry-rfq';
import { productNameSql, productSlugSql } from '@/server/products/resolve-product-translation';
import { db } from '@/server/db';
import { admins, inquiries, inquiryMessages, products, verificationTokens } from '@/server/db/schema';

export type InquiryStatus = 'new' | 'contacted' | 'quoted' | 'closed';

export type StorefrontInquiryMessage = {
  id: string;
  senderType: 'customer' | 'admin';
  body: string;
  createdAt: Date;
  adminName: string | null;
};

type InquiryInput = {
  productId: string;
  userId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  country?: string | null;
  message: string;
  sourcePageUrl?: string | null;
  rfqPayload?: InquiryRfqPayload | null;
};

type InquiryReceipt = {
  id: string;
  quoteNumber: string | null;
  fullName: string;
  email: string;
  guestAccessToken: string | null;
};

function toInquiryReceipt(record: {
  id: string;
  quoteNumber?: string | null;
  fullName: string;
  email: string;
  guestAccessToken?: string | null;
}): InquiryReceipt {
  return {
    id: record.id,
    quoteNumber: record.quoteNumber ?? null,
    fullName: record.fullName,
    email: record.email,
    guestAccessToken: record.guestAccessToken ?? null,
  };
}

function getInquiryTokenIdentifier(inquiryId: string) {
  return `inquiry:${inquiryId}`;
}

export function getGuestInquiryAccessCookieName(inquiryId: string) {
  return `guest_inquiry_access_${inquiryId}`;
}

function isQuoteNumber(value: string) {
  return /^QT-\d{6}-\d{4}$/.test(value);
}

async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `QT-${y}${m}${d}-`;

  const [row] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(ilike(inquiries.quoteNumber, `${prefix}%`));

  const seq = String(Number(row?.value ?? 0) + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

async function resolveInquiryId(idOrQuoteNumber: string): Promise<string | null> {
  if (isQuoteNumber(idOrQuoteNumber)) {
    const [row] = await db
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(eq(inquiries.quoteNumber, idOrQuoteNumber))
      .limit(1);
    return row?.id ?? null;
  }

  const [row] = await db
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(eq(inquiries.id, idOrQuoteNumber))
    .limit(1);
  return row?.id ?? null;
}

async function loadInquiryMessages(inquiryId: string): Promise<StorefrontInquiryMessage[]> {
  const rows = await db
    .select({
      id: inquiryMessages.id,
      senderType: inquiryMessages.senderType,
      body: inquiryMessages.body,
      createdAt: inquiryMessages.createdAt,
      adminName: admins.name,
    })
    .from(inquiryMessages)
    .leftJoin(admins, eq(admins.id, inquiryMessages.adminId))
    .where(eq(inquiryMessages.inquiryId, inquiryId))
    .orderBy(asc(inquiryMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    senderType: row.senderType,
    body: row.body,
    createdAt: row.createdAt,
    adminName: row.adminName,
  }));
}

export async function listStorefrontInquiryMessagesSince(
  inquiryId: string,
  since?: Date | null,
): Promise<StorefrontInquiryMessage[]> {
  const filters = [eq(inquiryMessages.inquiryId, inquiryId)];
  if (since) {
    filters.push(gt(inquiryMessages.createdAt, since));
  }

  const rows = await db
    .select({
      id: inquiryMessages.id,
      senderType: inquiryMessages.senderType,
      body: inquiryMessages.body,
      createdAt: inquiryMessages.createdAt,
      adminName: admins.name,
    })
    .from(inquiryMessages)
    .leftJoin(admins, eq(admins.id, inquiryMessages.adminId))
    .where(and(...filters))
    .orderBy(asc(inquiryMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    senderType: row.senderType,
    body: row.body,
    createdAt: row.createdAt,
    adminName: row.adminName,
  }));
}

export async function getStorefrontInquiryMessageCursor(
  inquiryId: string,
  messageId: string,
): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: inquiryMessages.createdAt })
    .from(inquiryMessages)
    .where(and(eq(inquiryMessages.inquiryId, inquiryId), eq(inquiryMessages.id, messageId)))
    .limit(1);

  return row?.createdAt ?? null;
}

async function assertInquiryAccess(input: {
  inquiryId: string;
  userId?: string | null;
  guestAccessToken?: string | null;
}) {
  const [inquiry] = await db
    .select({ id: inquiries.id, userId: inquiries.userId })
    .from(inquiries)
    .where(eq(inquiries.id, input.inquiryId))
    .limit(1);

  if (!inquiry) {
    return null;
  }

  if (input.userId) {
    return inquiry.userId === input.userId ? inquiry : null;
  }

  if (!input.guestAccessToken) {
    return null;
  }

  const [tokenRecord] = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, getInquiryTokenIdentifier(input.inquiryId)),
        eq(verificationTokens.token, input.guestAccessToken),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  return tokenRecord ? inquiry : null;
}

export async function createStorefrontInquiry(input: InquiryInput): Promise<InquiryReceipt | null> {
  const now = new Date();
  const quoteNumber = await generateQuoteNumber();
  const message = input.rfqPayload ? await buildRfqMessageTextAsync(input.rfqPayload) : input.message;

  const [created] = await db
    .insert(inquiries)
    .values({
      productId: input.productId,
      userId: input.userId ?? null,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      country: input.country ?? null,
      message,
      status: 'new',
      awaitingAdmin: true,
      queueKind: 'new_inquiry',
      lastMessageAt: now,
      sourcePageUrl: input.sourcePageUrl ?? null,
      quoteNumber,
      rfqPayload: input.rfqPayload ?? null,
    })
    .returning();

  if (!created) {
    return null;
  }

  await db.insert(inquiryMessages).values({
    inquiryId: created.id,
    senderType: 'customer',
    body: message,
    createdAt: now,
  });

  if (input.userId) {
    return toInquiryReceipt(created);
  }

  const guestAccessToken = randomUUID();
  await db
    .insert(verificationTokens)
    .values({
      identifier: getInquiryTokenIdentifier(created.id),
      token: guestAccessToken,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
    })
    .onConflictDoUpdate({
      target: verificationTokens.identifier,
      set: {
        token: guestAccessToken,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
      },
    });

  return toInquiryReceipt({ ...created, guestAccessToken });
}

export async function getStorefrontInquiryDetail(input: {
  inquiryId: string;
  userId?: string | null;
  guestAccessToken?: string | null;
}) {
  const access = await assertInquiryAccess(input);
  if (!access) {
    return null;
  }

  const [inquiry] = await db
    .select({
      id: inquiries.id,
      quoteNumber: inquiries.quoteNumber,
      userId: inquiries.userId,
      status: inquiries.status,
      fullName: inquiries.fullName,
      email: inquiries.email,
      phone: inquiries.phone,
      company: inquiries.company,
      country: inquiries.country,
      message: inquiries.message,
      sourcePageUrl: inquiries.sourcePageUrl,
      rfqPayload: inquiries.rfqPayload,
      quotedLines: inquiries.quotedLines,
      expiresAt: inquiries.expiresAt,
      createdAt: inquiries.createdAt,
      updatedAt: inquiries.updatedAt,
      productName: productNameSql(products.id),
      productSlug: productSlugSql(products.id),
      productSpu: products.spu,
    })
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .where(eq(inquiries.id, input.inquiryId))
    .limit(1);

  if (!inquiry) {
    return null;
  }

  const messages = await loadInquiryMessages(input.inquiryId);
  return { ...inquiry, messages };
}

export async function getStorefrontInquiryDetailByIdOrQuoteNumber(input: {
  idOrQuoteNumber: string;
  userId?: string | null;
  guestAccessToken?: string | null;
}) {
  const inquiryId = await resolveInquiryId(input.idOrQuoteNumber);
  if (!inquiryId) {
    return null;
  }

  return getStorefrontInquiryDetail({
    inquiryId,
    userId: input.userId,
    guestAccessToken: input.guestAccessToken,
  });
}

export async function getStorefrontInquiriesByUser(userId: string, locale = 'en') {
  const rows = await db
    .select({
      id: inquiries.id,
      quoteNumber: inquiries.quoteNumber,
      status: inquiries.status,
      fullName: inquiries.fullName,
      email: inquiries.email,
      company: inquiries.company,
      country: inquiries.country,
      message: inquiries.message,
      rfqPayload: inquiries.rfqPayload,
      quotedLines: inquiries.quotedLines,
      expiresAt: inquiries.expiresAt,
      createdAt: inquiries.createdAt,
      productName: productNameSql(products.id),
      productSlug: productSlugSql(products.id),
      productSpu: products.spu,
    })
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .where(eq(inquiries.userId, userId))
    .orderBy(desc(inquiries.createdAt));

  return rows.map((row) => {
    const payload = row.rfqPayload as InquiryRfqPayload | null;
    const quotedLines = (row.quotedLines ?? null) as InquiryQuotedLine[] | null;
    const lineCount = payload?.lines?.length ?? 0;
    const projectName = payload?.project?.projectName ?? row.productName ?? 'Inquiry';

    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      status: row.status,
      fullName: row.fullName,
      email: row.email,
      company: row.company,
      country: row.country,
      message: row.message,
      projectName,
      lineCount,
      valueLabel: summarizeQuotedValue(quotedLines, locale),
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      productName: row.productName,
      productSlug: row.productSlug,
      productSpu: row.productSpu,
      rfqPayload: payload,
      quotedLines,
    };
  });
}

export async function postStorefrontInquiryMessage(input: {
  inquiryId: string;
  userId?: string | null;
  guestAccessToken?: string | null;
  body: string;
}) {
  const access = await assertInquiryAccess({
    inquiryId: input.inquiryId,
    userId: input.userId,
    guestAccessToken: input.guestAccessToken,
  });
  if (!access) {
    return null;
  }

  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    return null;
  }

  const now = new Date();
  await db.insert(inquiryMessages).values({
    inquiryId: input.inquiryId,
    senderType: 'customer',
    body: trimmedBody,
    createdAt: now,
  });

  await db
    .update(inquiries)
    .set({
      awaitingAdmin: true,
      queueKind: 'customer_replied',
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(inquiries.id, input.inquiryId));

  return getStorefrontInquiryDetail({
    inquiryId: input.inquiryId,
    userId: input.userId,
    guestAccessToken: input.guestAccessToken,
  });
}

export async function getStorefrontInquiryForQuoteCheckout(input: {
  quoteNumber: string;
  userId: string;
}) {
  const [inquiry] = await db
    .select({
      id: inquiries.id,
      quoteNumber: inquiries.quoteNumber,
      status: inquiries.status,
      userId: inquiries.userId,
      quotedLines: inquiries.quotedLines,
      expiresAt: inquiries.expiresAt,
    })
    .from(inquiries)
    .where(eq(inquiries.quoteNumber, input.quoteNumber))
    .limit(1);

  if (!inquiry || inquiry.userId !== input.userId) {
    return null;
  }

  if (inquiry.status !== 'quoted') {
    return null;
  }

  if (inquiry.expiresAt && inquiry.expiresAt < new Date()) {
    return null;
  }

  const quotedLines = (inquiry.quotedLines ?? []) as InquiryQuotedLine[];
  if (!quotedLines.length) {
    return null;
  }

  return {
    id: inquiry.id,
    quoteNumber: inquiry.quoteNumber!,
    quotedLines,
  };
}
