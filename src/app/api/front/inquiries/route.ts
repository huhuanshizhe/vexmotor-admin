import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { LOCALE_REQUEST_HEADER, normalizeLocale } from '@/lib/i18n';
import { buildRfqMessageTextAsync, normalizeRfqPayloadAsync } from '@/lib/inquiry-rfq-server';
import { getCurrentUserId } from '@/server/auth/session';
import {
  createStorefrontInquiry,
  getGuestInquiryAccessCookieName,
  getStorefrontInquiriesByUser,
} from '@/server/storefront/inquiries';

const attachmentSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const rfqLineSchema = z.object({
  productId: z.string().nullable(),
  spu: z.string(),
  name: z.string(),
  slug: z.string(),
  quantity: z.union([z.number(), z.string()]),
  requiredBy: z.string(),
  notes: z.string(),
  coverImage: z.object({ url: z.string(), alt: z.string() }).nullable().optional(),
  lineAttachments: z.array(attachmentSchema).optional(),
});

const rfqProjectSchema = z.object({
  projectName: z.string(),
  industry: z.string(),
  targetStartDate: z.string(),
  annualVolumeEstimate: z.string(),
});

const rfqContactSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  company: z.string(),
  country: z.string(),
  phone: z.string(),
  vat: z.string(),
  createAccount: z.boolean(),
});

const rfqComplianceSchema = z.object({
  unrestrictedUseConfirmed: z.boolean(),
  complianceAccepted: z.boolean(),
});

const productRfqPayloadSchema = z.object({
  kind: z.literal('rfq').optional(),
  project: rfqProjectSchema,
  contact: rfqContactSchema,
  compliance: rfqComplianceSchema,
  lines: z.array(rfqLineSchema).min(1),
  projectAttachments: z.array(attachmentSchema),
});

const contactRfqPayloadSchema = z.object({
  kind: z.literal('contact'),
  procurementDetails: z.string().min(1),
  project: rfqProjectSchema,
  contact: rfqContactSchema,
  compliance: rfqComplianceSchema,
  lines: z.array(rfqLineSchema).default([]),
  projectAttachments: z.array(attachmentSchema),
});

const inquirySchema = z.object({
  productId: z.string().min(1).nullable().optional(),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  message: z.string().min(1).optional(),
  rfqPayload: z.union([productRfqPayloadSchema, contactRfqPayloadSchema]).optional(),
}).superRefine((data, ctx) => {
  if (data.rfqPayload?.kind === 'contact') {
    if (data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact inquiries must not include productId.',
        path: ['productId'],
      });
    }
    return;
  }

  if (data.rfqPayload) {
    if (!data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'productId is required for product RFQ inquiries.',
        path: ['productId'],
      });
    }
    return;
  }

  if (!data.productId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'productId is required for legacy inquiries.',
      path: ['productId'],
    });
  }

  if (!data.message?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Message or rfqPayload is required.',
      path: ['message'],
    });
  }
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid inquiry payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const userId = await getCurrentUserId(request);
  const rfqPayload = parsed.data.rfqPayload ? await normalizeRfqPayloadAsync(parsed.data.rfqPayload) : null;
  const country = rfqPayload?.contact.country ?? parsed.data.country ?? null;
  const message = parsed.data.message?.trim()
    ?? (rfqPayload ? await buildRfqMessageTextAsync(rfqPayload) : '');

  if (!message && !rfqPayload) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Message or rfqPayload is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const created = await createStorefrontInquiry({
    productId: parsed.data.productId ?? null,
    userId,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    company: parsed.data.company ?? null,
    country,
    message,
    sourcePageUrl: request.headers.get('referer') ?? null,
    rfqPayload,
  });

  if (!created) {
    return NextResponse.json(
      { code: 'INQUIRY_CREATE_FAILED', message: 'Unable to submit your inquiry right now.' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const quoteNumber = created.quoteNumber ?? created.id;
  const redirectPath = `/account/quotes/${quoteNumber}`;

  const response = NextResponse.json(
    {
      id: created.id,
      quoteNumber: created.quoteNumber,
      fullName: created.fullName,
      email: created.email,
      redirectPath,
    },
    { status: 201, headers: frontCorsHeaders() },
  );

  if (!userId && created.guestAccessToken) {
    response.cookies.set(getGuestInquiryAccessCookieName(created.id), created.guestAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const locale = normalizeLocale(request.headers.get(LOCALE_REQUEST_HEADER));
  return NextResponse.json(await getStorefrontInquiriesByUser(userId, locale), { headers: frontCorsHeaders() });
}
