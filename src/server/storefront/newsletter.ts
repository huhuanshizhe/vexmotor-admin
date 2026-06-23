import { db } from '@/server/db';
import { newsletterSubscribers } from '@/server/db/schema';

export async function subscribeToNewsletter(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = new Date();
  const subscription = {
    email: normalizedEmail,
    status: 'subscribed' as const,
    source: 'storefront-footer',
  };

  await db
    .insert(newsletterSubscribers)
    .values({
      email: normalizedEmail,
      status: 'subscribed',
      source: 'storefront-footer',
      subscribedAt: timestamp,
      unsubscribedAt: null,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: {
        status: 'subscribed',
        source: 'storefront-footer',
        subscribedAt: timestamp,
        unsubscribedAt: null,
        updatedAt: timestamp,
      },
    });

  return subscription;
}