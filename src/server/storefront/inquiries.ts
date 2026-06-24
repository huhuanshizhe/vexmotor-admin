import { randomUUID } from 'node:crypto';

import { and, desc, eq, gt } from 'drizzle-orm';

import { productNameSql, productSlugSql } from '@/server/products/resolve-product-translation';
import { db } from '@/server/db';
import { inquiries, products, verificationTokens } from '@/server/db/schema';

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

function toInquiryReceipt(record: { id: string; fullName: string; email: string; guestAccessToken?: string | null }): InquiryReceipt {
  return {
    id: record.id,
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

export async function createStorefrontInquiry(input: InquiryInput): Promise<InquiryReceipt | null> {
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

export async function getStorefrontInquiryDetail(input: { inquiryId: string; userId?: string | null; guestAccessToken?: string | null }) {
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
      productName: productNameSql(products.id),
      productSlug: productSlugSql(products.id),
      productSku: products.sku,
    })
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
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

export async function getStorefrontInquiriesByUser(userId: string) {
  return db
    .select({
      id: inquiries.id,
      status: inquiries.status,
      fullName: inquiries.fullName,
      email: inquiries.email,
      company: inquiries.company,
      country: inquiries.country,
      message: inquiries.message,
      createdAt: inquiries.createdAt,
      productName: productNameSql(products.id),
      productSlug: productSlugSql(products.id),
      productSku: products.sku,
    })
    .from(inquiries)
    .innerJoin(products, eq(products.id, inquiries.productId))
    .where(eq(inquiries.userId, userId))
    .orderBy(desc(inquiries.createdAt));
}
