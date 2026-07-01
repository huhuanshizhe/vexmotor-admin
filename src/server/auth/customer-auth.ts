import { randomUUID } from 'node:crypto';

import { and, eq, gt } from 'drizzle-orm';

import { md5Hash, compareMd5 } from '@/lib/auth/password';
import type { RegistrationDocumentInput } from '@/lib/customer-profile';
import { normalizeCompanyCountryCode, normalizeCompanyCountryCodeAsync } from '@/lib/customer-countries';
import { normalizeCustomerIndustry } from '@/lib/customer-industries';
import {
  isValidRegistrationDocumentInput,
  normalizeRegistrationDocuments,
} from '@/lib/registration-documents';
import { grantRegistrationCoupons } from '@/server/admin/coupons';
import { db } from '@/server/db';
import { users, verificationTokens } from '@/server/db/schema';
import { sendWelcomeEmail, sendPasswordResetEmail } from '@/server/email';

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
  jobTitle?: string | null;
  companyName: string;
  country: string;
  industry: string;
  companySize: string;
  website: string;
  taxId: string;
  annualVolumeEstimate?: string | null;
  documents: RegistrationDocumentInput[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  exportComplianceAccepted: boolean;
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

function validateRegistrationDocuments(documents: RegistrationDocumentInput[]) {
  for (const document of documents) {
    if (!isValidRegistrationDocumentInput(document)) {
      return false;
    }
  }
  return true;
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

  if (!validateRegistrationDocuments(input.documents)) {
    return {
      ok: false,
      code: 'INVALID_STATE',
      message: 'One or more verification documents are invalid.',
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
      jobTitle: input.jobTitle?.trim() || null,
      company: input.companyName.trim() || null,
      industry: normalizeCustomerIndustry(input.industry),
      companyCountryCode: await normalizeCompanyCountryCodeAsync(input.country),
      website: input.website.trim() || null,
      taxId: input.taxId.trim() || null,
      companySize: input.companySize.trim() || null,
      annualVolumeEstimate: input.annualVolumeEstimate?.trim() || null,
      verificationDocuments: normalizeRegistrationDocuments(input.documents),
      role: 'customer',
      status: 'active',
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

export type RegisterEmailAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  industry?: string | null;
  country?: string | null;
  companySize?: string | null;
  website?: string | null;
  taxId?: string | null;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
};

export async function registerEmailAccount(input: RegisterEmailAccountInput): Promise<RegisterBusinessAccountResult> {
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

  const companyName = input.companyName?.trim() ?? '';

  const [created] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash: md5Hash(input.password),
      firstName,
      lastName,
      phone: input.phone?.trim() || null,
      company: companyName || null,
      industry: normalizeCustomerIndustry(input.industry ?? null),
      companyCountryCode: await normalizeCompanyCountryCodeAsync(input.country ?? null),
      website: input.website?.trim() || null,
      taxId: input.taxId?.trim() || null,
      companySize: input.companySize?.trim() || null,
      role: 'customer',
      status: 'active',
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
      message: 'Unable to create the account right now.',
    };
  }

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

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.status === 'disabled') {
    return { ok: false as const, code: 'UNAUTHORIZED' as const, message: 'User not found' };
  }

  if (!compareMd5(currentPassword, user.passwordHash)) {
    return { ok: false as const, code: 'INVALID_PASSWORD' as const, message: 'Current password is incorrect' };
  }

  await db
    .update(users)
    .set({
      passwordHash: md5Hash(newPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { ok: true as const };
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
