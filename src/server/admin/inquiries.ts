import { desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { inquiries, products, users } from '@/server/db/schema';
import { getMemoryAdminInquiryDetail, getMemoryAdminInquiries, type InquiryStatus, updateMemoryAdminInquiry } from '@/server/storefront/inquiries';

export async function getAdminInquiries() {
  if (!db) {
    return getMemoryAdminInquiries();
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
        createdAt: inquiries.createdAt,
        handledAt: inquiries.handledAt,
        productName: products.name,
        productSlug: products.slug,
        productSku: products.sku,
      })
      .from(inquiries)
      .innerJoin(products, eq(products.id, inquiries.productId))
      .orderBy(desc(inquiries.createdAt));
  } catch {
    return getMemoryAdminInquiries();
  }
}

export async function getAdminInquiryDetail(id: string) {
  if (!db) {
    return getMemoryAdminInquiryDetail(id);
  }

  try {
    const [inquiry] = await db
      .select({
        id: inquiries.id,
        status: inquiries.status,
        fullName: inquiries.fullName,
        email: inquiries.email,
        phone: inquiries.phone,
        company: inquiries.company,
        country: inquiries.country,
        message: inquiries.message,
        sourcePageUrl: inquiries.sourcePageUrl,
        internalNote: inquiries.internalNote,
        createdAt: inquiries.createdAt,
        handledAt: inquiries.handledAt,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productSku: products.sku,
        handledByEmail: users.email,
      })
      .from(inquiries)
      .innerJoin(products, eq(products.id, inquiries.productId))
      .leftJoin(users, eq(users.id, inquiries.handledBy))
      .where(eq(inquiries.id, id))
      .limit(1);

    return inquiry ?? null;
  } catch {
    return getMemoryAdminInquiryDetail(id);
  }
}

export async function updateAdminInquiry(input: {
  id: string;
  status?: InquiryStatus;
  internalNote?: string | null;
  handledBy?: string | null;
  handledByEmail?: string | null;
}) {
  if (!db) {
    return updateMemoryAdminInquiry(input);
  }

  try {
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

    if (!updated) {
      return null;
    }

    return getAdminInquiryDetail(input.id);
  } catch {
    return updateMemoryAdminInquiry(input);
  }
}
