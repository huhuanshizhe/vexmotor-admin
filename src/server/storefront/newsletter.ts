import { db } from '@/server/db';
import { newsletterSubscribers } from '@/server/db/schema';

const memorySubscribers = new Set<string>();

export async function subscribeToNewsletter(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = new Date();
  const subscription = {
    email: normalizedEmail,
    status: 'subscribed' as const,
    source: 'storefront-footer',
  };

  if (!db) {
    memorySubscribers.add(normalizedEmail);
    return subscription;
  }

  try {
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
  } catch (error) {
    console.error('Newsletter persistence failed, falling back to in-memory storage.', error);
    memorySubscribers.add(normalizedEmail);
  }

  return subscription;
}