import { randomUUID } from 'node:crypto';

import { and, eq, gt } from 'drizzle-orm';

import { getSiteUrl } from '@/lib/app-urls';
import { db } from '@/server/db';
import { users, verificationTokens } from '@/server/db/schema';
import { sendEmailVerificationEmail } from '@/server/email';

const EMAIL_VERIFY_EXPIRY_MS = 1000 * 60 * 60 * 24;
const RESEND_COOLDOWN_MS = 1000 * 60 * 2;

export function getEmailVerificationIdentifier(userId: string) {
  return `email-verify:${userId}`;
}

function parseEmailVerificationUserId(identifier: string): string | null {
  const prefix = 'email-verify:';
  if (!identifier.startsWith(prefix)) {
    return null;
  }

  const userId = identifier.slice(prefix.length).trim();
  return userId || null;
}

export async function createEmailVerificationRequest(userId: string): Promise<
  | { ok: true }
  | { ok: false; code: 'ALREADY_VERIFIED' | 'USER_NOT_FOUND'; message: string }
> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  if (user.emailVerifiedAt) {
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'This email is already verified.' };
  }

  const identifier = getEmailVerificationIdentifier(userId);
  const [existingToken] = await db
    .select({
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier))
    .limit(1);

  if (existingToken && existingToken.expires > new Date()) {
    const createdAt = existingToken.expires.getTime() - EMAIL_VERIFY_EXPIRY_MS;
    if (Date.now() - createdAt < RESEND_COOLDOWN_MS) {
      return { ok: true };
    }
  }

  const token = randomUUID();
  const expires = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS);
  const verifyUrl = `${getSiteUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({
    identifier,
    token,
    expires,
  });

  const emailResult = await sendEmailVerificationEmail({ to: user.email, verifyUrl });
  if (!emailResult.ok) {
    console.error('[auth] Email verification send error:', emailResult.error);
  }

  return { ok: true };
}

export async function verifyEmailVerificationToken(
  token: string,
): Promise<
  | { valid: true; email: string; userId: string }
  | { valid: false; code: 'INVALID_TOKEN'; message: string }
> {
  const [tokenRecord] = await db
    .select({
      identifier: verificationTokens.identifier,
    })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), gt(verificationTokens.expires, new Date())))
    .limit(1);

  if (!tokenRecord) {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'This verification link is invalid or has expired.',
    };
  }

  const userId = parseEmailVerificationUserId(tokenRecord.identifier);
  if (!userId) {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'This verification link is invalid or has expired.',
    };
  }

  const [user] = await db
    .select({
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'This verification link is invalid or has expired.',
    };
  }

  return { valid: true, email: user.email, userId };
}

export async function confirmEmailVerification(token: string): Promise<
  | { ok: true; email: string }
  | { ok: false; code: 'INVALID_TOKEN' | 'ALREADY_VERIFIED'; message: string }
> {
  const verification = await verifyEmailVerificationToken(token);
  if (!verification.valid) {
    return { ok: false, code: 'INVALID_TOKEN', message: verification.message };
  }

  const [user] = await db
    .select({
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, verification.userId))
    .limit(1);

  if (user?.emailVerifiedAt) {
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, getEmailVerificationIdentifier(verification.userId)));
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'This email is already verified.' };
  }

  await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, verification.userId));

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, getEmailVerificationIdentifier(verification.userId)));

  return { ok: true, email: verification.email };
}
