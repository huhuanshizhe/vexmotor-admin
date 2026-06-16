import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { accounts, users } from '@/server/db/schema';

type OAuthLinkInput = {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string | null;
};

function splitDisplayName(name?: string | null) {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return { firstName: 'User', lastName: '' };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? 'User',
    lastName: parts.slice(1).join(' '),
  };
}

export async function linkOAuthAccount(input: OAuthLinkInput): Promise<string | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return null;
  }

  if (!db) {
    return randomUUID();
  }

  const [existingAccount] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.provider, input.provider), eq(accounts.providerAccountId, input.providerAccountId)))
    .limit(1);

  if (existingAccount) {
    return existingAccount.userId;
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const userId = existingUser?.id ?? randomUUID();

  if (!existingUser) {
    const { firstName, lastName } = splitDisplayName(input.name);
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: randomUUID().replace(/-/g, ''),
      firstName,
      lastName,
      role: 'customer',
      status: 'active',
    });
  }

  await db
    .insert(accounts)
    .values({
      userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      type: 'oauth',
    })
    .onConflictDoNothing();

  return userId;
}
