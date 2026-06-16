import { randomUUID } from 'node:crypto';

import { desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { inquiries, products } from '@/server/db/schema';

import { getSeedProductById } from './seed';

export type InquiryStatus = 'new' | 'contacted' | 'quoted' | 'closed';

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
};

type InquiryReceipt = {
  id: string;
  fullName: string;
  email: string;
  guestAccessToken: string | null;
};

type MemoryInquiry = {
  id: string;
  productId: string;
  userId: string | null;
  guestAccessToken: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  message: string;
  status: InquiryStatus;
  sourcePageUrl: string | null;
  handledBy: string | null;
  handledByEmail: string | null;
  handledAt: Date | null;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  productName: string;
  productSlug: string;
  productSku: string;
};

declare global {
  var __vexmotorMemoryInquiryStore__:
    | {
        items: MemoryInquiry[];
        guestAccessTokensById: Map<string, string>;
      }
    | undefined;
}

function getMemoryInquiryStore() {
  if (!globalThis.__vexmotorMemoryInquiryStore__) {
    globalThis.__vexmotorMemoryInquiryStore__ = {
      items: [],
      guestAccessTokensById: new Map(),
    };
  }

  if (!globalThis.__vexmotorMemoryInquiryStore__.guestAccessTokensById) {
    globalThis.__vexmotorMemoryInquiryStore__.guestAccessTokensById = new Map();
  }

  for (const item of globalThis.__vexmotorMemoryInquiryStore__.items) {
    if (typeof item.handledBy === 'undefined') {
      item.handledBy = null;
    }
    if (typeof item.handledByEmail === 'undefined') {
      item.handledByEmail = null;
    }
    if (typeof item.handledAt === 'undefined') {
      item.handledAt = null;
    }
    if (typeof item.internalNote === 'undefined') {
      item.internalNote = null;
    }
  }

  return globalThis.__vexmotorMemoryInquiryStore__;
}

function createMemoryInquiry(input: InquiryInput) {
  const product = getSeedProductById(input.productId);
  if (!product) {
    return null;
  }

  const now = new Date();
  const guestAccessToken = input.userId ? null : randomUUID();
  const created: MemoryInquiry = {
    id: randomUUID(),
    productId: input.productId,
    userId: input.userId ?? null,
    guestAccessToken,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    company: input.company ?? null,
    country: input.country ?? null,
    message: input.message,
    status: 'new',
    sourcePageUrl: input.sourcePageUrl ?? null,
    handledBy: null,
    handledByEmail: null,
    handledAt: null,
    internalNote: null,
    createdAt: now,
    updatedAt: now,
    productName: product.name,
    productSlug: product.slug,
    productSku: product.sku,
  };

  const store = getMemoryInquiryStore();
  store.items.unshift(created);
  if (guestAccessToken) {
    store.guestAccessTokensById.set(created.id, guestAccessToken);
  }

  return created;
}

function getGuestAccessTokenForInquiry(inquiryId: string) {
  const store = getMemoryInquiryStore();
  const existing = store.items.find((item) => item.id === inquiryId);
  if (existing?.guestAccessToken) {
    return existing.guestAccessToken;
  }

  const mapped = store.guestAccessTokensById.get(inquiryId);
  if (mapped) {
    return mapped;
  }

  const nextToken = randomUUID();
  store.guestAccessTokensById.set(inquiryId, nextToken);
  return nextToken;
}

function toInquiryReceipt(record: { id: string; fullName: string; email: string; guestAccessToken?: string | null }): InquiryReceipt {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    guestAccessToken: record.guestAccessToken ?? null,
  };
}

export function getGuestInquiryAccessCookieName(inquiryId: string) {
  return `guest_inquiry_access_${inquiryId}`;
}

export async function createStorefrontInquiry(input: InquiryInput): Promise<InquiryReceipt | null> {
  if (!db) {
    const created = createMemoryInquiry(input);
    return created ? toInquiryReceipt(created) : null;
  }

  try {
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
        message: input.message,
        status: 'new',
        sourcePageUrl: input.sourcePageUrl ?? null,
      })
      .returning();

    if (!created) {
      return null;
    }

    return toInquiryReceipt({
      ...created,
      guestAccessToken: input.userId ? null : getGuestAccessTokenForInquiry(created.id),
    });
  } catch {
    const created = createMemoryInquiry(input);
    return created ? toInquiryReceipt(created) : null;
  }
}

export async function getStorefrontInquiryDetail(input: { inquiryId: string; userId?: string | null; guestAccessToken?: string | null }) {
  const fromMemory = () => {
    const inquiry = getMemoryInquiryStore().items.find((item) => item.id === input.inquiryId);
    if (!inquiry) {
      return null;
    }

    const isAuthorized = input.userId ? inquiry.userId === input.userId : Boolean(input.guestAccessToken && inquiry.guestAccessToken === input.guestAccessToken);
    if (!isAuthorized) {
      return null;
    }

    return {
      id: inquiry.id,
      status: inquiry.status,
      fullName: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone,
      company: inquiry.company,
      country: inquiry.country,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      sourcePageUrl: inquiry.sourcePageUrl,
      productName: inquiry.productName,
      productSlug: inquiry.productSlug,
      productSku: inquiry.productSku,
    };
  };

  if (!db) {
    return fromMemory();
  }

  try {
    const [inquiry] = await db
      .select({
        id: inquiries.id,
        userId: inquiries.userId,
        status: inquiries.status,
        fullName: inquiries.fullName,
        email: inquiries.email,
        phone: inquiries.phone,
        company: inquiries.company,
        country: inquiries.country,
        message: inquiries.message,
        sourcePageUrl: inquiries.sourcePageUrl,
        createdAt: inquiries.createdAt,
        updatedAt: inquiries.updatedAt,
        productName: products.name,
        productSlug: products.slug,
        productSku: products.sku,
      })
      .from(inquiries)
      .innerJoin(products, eq(products.id, inquiries.productId))
      .where(eq(inquiries.id, input.inquiryId))
      .limit(1);

    if (!inquiry) {
      return null;
    }

    const isAuthorized = input.userId
      ? inquiry.userId === input.userId
      : Boolean(input.guestAccessToken && input.guestAccessToken === getMemoryInquiryStore().guestAccessTokensById.get(inquiry.id));

    if (!isAuthorized) {
      return null;
    }

    return inquiry;
  } catch {
    return fromMemory();
  }
}

export async function getStorefrontInquiriesByUser(userId: string) {
  if (!db) {
    return getMemoryInquiryStore().items
      .filter((item) => item.userId === userId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        fullName: item.fullName,
        email: item.email,
        company: item.company,
        country: item.country,
        message: item.message,
        createdAt: item.createdAt,
        productName: item.productName,
        productSlug: item.productSlug,
        productSku: item.productSku,
      }));
  }

  try {
    return await db
      .select({
        id: inquiries.id,
        status: inquiries.status,
        fullName: inquiries.fullName,
        email: inquiries.email,
        company: inquiries.company,
        country: inquiries.country,
        message: inquiries.message,
        createdAt: inquiries.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productSku: products.sku,
      })
      .from(inquiries)
      .innerJoin(products, eq(products.id, inquiries.productId))
      .where(eq(inquiries.userId, userId))
      .orderBy(desc(inquiries.createdAt));
  } catch {
    return getMemoryInquiryStore().items
      .filter((item) => item.userId === userId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        fullName: item.fullName,
        email: item.email,
        company: item.company,
        country: item.country,
        message: item.message,
        createdAt: item.createdAt,
        productName: item.productName,
        productSlug: item.productSlug,
        productSku: item.productSku,
      }));
  }
}

function mapAdminInquirySummary(item: MemoryInquiry) {
  return {
    id: item.id,
    status: item.status,
    fullName: item.fullName,
    email: item.email,
    company: item.company,
    country: item.country,
    createdAt: item.createdAt,
    handledAt: item.handledAt,
    productName: item.productName,
    productSlug: item.productSlug,
    productSku: item.productSku,
  };
}

function mapAdminInquiryDetail(item: MemoryInquiry) {
  return {
    id: item.id,
    status: item.status,
    fullName: item.fullName,
    email: item.email,
    phone: item.phone,
    company: item.company,
    country: item.country,
    message: item.message,
    sourcePageUrl: item.sourcePageUrl,
    internalNote: item.internalNote,
    createdAt: item.createdAt,
    handledAt: item.handledAt,
    productId: item.productId,
    productName: item.productName,
    productSlug: item.productSlug,
    productSku: item.productSku,
    handledByEmail: item.handledByEmail,
  };
}

export function getMemoryAdminInquiries() {
  return [...getMemoryInquiryStore().items]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map(mapAdminInquirySummary);
}

export function getMemoryAdminInquiryDetail(id: string) {
  const inquiry = getMemoryInquiryStore().items.find((item) => item.id === id);
  return inquiry ? mapAdminInquiryDetail(inquiry) : null;
}

export function updateMemoryAdminInquiry(input: {
  id: string;
  status?: InquiryStatus;
  internalNote?: string | null;
  handledBy?: string | null;
  handledByEmail?: string | null;
}) {
  const inquiry = getMemoryInquiryStore().items.find((item) => item.id === input.id);
  if (!inquiry) {
    return null;
  }

  if (typeof input.status !== 'undefined') {
    inquiry.status = input.status;
    if (input.status === 'new') {
      inquiry.handledAt = null;
      inquiry.handledBy = null;
      inquiry.handledByEmail = null;
    } else {
      inquiry.handledAt = new Date();
      inquiry.handledBy = input.handledBy ?? null;
      inquiry.handledByEmail = input.handledByEmail ?? null;
    }
  }

  if (typeof input.internalNote !== 'undefined') {
    inquiry.internalNote = input.internalNote;
  }

  inquiry.updatedAt = new Date();
  return mapAdminInquiryDetail(inquiry);
}