import { randomUUID } from 'node:crypto';

import { and, eq, gt } from 'drizzle-orm';

import { md5Hash } from '@/lib/auth/password';
import { normalizeCompanyCountryCode } from '@/lib/customer-countries';
import { normalizeCustomerIndustry } from '@/lib/customer-industries';
import { grantRegistrationCoupons } from '@/server/admin/coupons';
import { db } from '@/server/db';
import { products, users, verificationTokens } from '@/server/db/schema';
import { sendWelcomeEmail, sendPasswordResetEmail } from '@/server/email';
import { createStorefrontInquiry } from '@/server/storefront/inquiries';

type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  company: string | null;
  status: 'active' | 'disabled' | 'pending';
};

export type RegisterBusinessAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  companyName: string;
  country: string;
  industry: string;
  companySize: string;
  website: string;
  taxId: string;
  annualVolumeEstimate?: string;
  documents: string[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  exportComplianceAccepted: boolean;
  sourcePageUrl?: string | null;
};

type RegisterBusinessAccountResult =
  | {
      ok: true;
      user: Pick<AuthUserRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'company' | 'status'>;
    }
  | {
      ok: false;
      code: 'EMAIL_EXISTS' | 'INVALID_STATE';
      message: string;
    };

type PasswordResetRequestResult = {
  ok: true;
  resetUrl: string | null;
};

type PasswordResetResult =
  | { ok: true; email: string }
  | { ok: false; code: 'INVALID_TOKEN'; message: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function splitName(input: { firstName: string; lastName: string }) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
  };
}

async function resolveAuthIntakeProductId() {
  const fallbackId = 'legacy-registration-intake';
  const [product] = await db.select({ id: products.id }).from(products).limit(1);
  return product?.id ?? fallbackId;
}

function buildRegistrationReviewMessage(input: RegisterBusinessAccountInput) {
  return [
    'BUSINESS REGISTRATION REVIEW',
    `Role: ${input.role || 'Not specified'}`,
    `Country: ${input.country || 'Not specified'}`,
    `Industry: ${input.industry || 'Not specified'}`,
    `Company size: ${input.companySize || 'Not specified'}`,
    `Website: ${input.website || 'Not specified'}`,
    `VAT / Tax ID / EORI: ${input.taxId || 'Not specified'}`,
    `Annual volume estimate: ${input.annualVolumeEstimate?.trim() || 'Not specified'}`,
    `Documents: ${input.documents.length ? input.documents.join(', ') : 'None uploaded'}`,
    '',
    'COMPLIANCE',
    `Terms accepted: ${input.termsAccepted ? 'yes' : 'no'}`,
    `Privacy accepted: ${input.privacyAccepted ? 'yes' : 'no'}`,
    `Export compliance accepted: ${input.exportComplianceAccepted ? 'yes' : 'no'}`,
  ].join('\n');
}

async function createRegistrationReview(input: RegisterBusinessAccountInput, userId: string | null) {
  const intakeProductId = await resolveAuthIntakeProductId();
  const { firstName, lastName } = splitName(input);

  await createStorefrontInquiry({
    productId: intakeProductId,
    userId,
    fullName: `${firstName} ${lastName}`.trim(),
    email: normalizeEmail(input.email),
    company: input.companyName.trim() || null,
    country: input.country.trim() || null,
    message: buildRegistrationReviewMessage(input),
    sourcePageUrl: input.sourcePageUrl ?? '/register',
  });
}

export async function getAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      firstName: users.firstName,
      lastName: users.lastName,
      company: users.company,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return user ?? null;
}

export async function registerBusinessAccount(input: RegisterBusinessAccountInput): Promise<RegisterBusinessAccountResult> {
  if (!input.termsAccepted || !input.privacyAccepted || !input.exportComplianceAccepted) {
    return {
      ok: false,
      code: 'INVALID_STATE',
      message: 'Accept the required terms before creating the business account.',
    };
  }

  const normalizedEmail = normalizeEmail(input.email);
  const { firstName, lastName } = splitName(input);
  const existing = await getAuthUserByEmail(normalizedEmail);

  if (existing) {
    return {
      ok: false,
      code: 'EMAIL_EXISTS',
      message: 'This email is already registered. Sign in to continue.',
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash: md5Hash(input.password),
      firstName,
      lastName,
      company: input.companyName.trim() || null,
      industry: normalizeCustomerIndustry(input.industry),
      companyCountryCode: normalizeCompanyCountryCode(input.country),
      website: input.website.trim() || null,
      taxId: input.taxId.trim() || null,
      companySize: input.companySize.trim() || null,
      role: 'customer',
      status: 'pending',
    })
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      company: users.company,
      status: users.status,
    });

  if (!created) {
    return {
      ok: false,
      code: 'INVALID_STATE',
      message: 'Unable to create the business account right now.',
    };
  }

  await createRegistrationReview(input, created.id);

  grantRegistrationCoupons(created.id).catch((err) => {
    console.error('[auth] grantRegistrationCoupons error:', err);
  });

  sendWelcomeEmail({
    to: normalizedEmail,
    firstName: created.firstName,
    companyName: created.company,
    accountStatus: created.status,
  }).catch((err) => console.error('[auth] Welcome email error:', err));

  return {
    ok: true,
    user: created,
  };
}

export async function createPasswordResetRequest(email: string): Promise<PasswordResetRequestResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await getAuthUserByEmail(normalizedEmail);

  if (!user) {
    return { ok: true, resetUrl: null };
  }

  const token = randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60);
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4000';
  const fullResetUrl = `${appUrl}/password-reset?token=${encodeURIComponent(token)}`;

  // Send reset email (non-blocking)
  sendPasswordResetEmail({ to: normalizedEmail, resetUrl: fullResetUrl })
    .catch((err) => console.error('[auth] Password reset email error:', err));

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, normalizedEmail));
  await db.insert(verificationTokens).values({
    identifier: normalizedEmail,
    token,
    expires,
  });

  return {
    ok: true,
    resetUrl: process.env.NODE_ENV === 'production' ? null : fullResetUrl,
  };
}

export async function resetPasswordWithToken(input: { token: string; password: string }): Promise<PasswordResetResult> {
  const [tokenRecord] = await db
    .select({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
    })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, input.token), gt(verificationTokens.expires, new Date())))
    .limit(1);

  if (!tokenRecord) {
    return {
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'This reset link is invalid or has expired.',
    };
  }

  await db
    .update(users)
    .set({
      passwordHash: md5Hash(input.password),
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(users.email, tokenRecord.identifier));

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, tokenRecord.identifier));

  return {
    ok: true,
    email: tokenRecord.identifier,
  };
}