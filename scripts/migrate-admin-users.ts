import '@/lib/env';

import { eq } from 'drizzle-orm';

import { md5Hash } from '@/lib/auth/password';
import { db } from '@/server/db';
import { admins, users } from '@/server/db/schema';

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required for admin migration');
  }

  const adminUsers = await db.select().from(users).where(eq(users.role, 'admin' as never));

  for (const user of adminUsers) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    await db
      .insert(admins)
      .values({
        email: user.email,
        passwordHash: user.passwordHash,
        name,
        role: 'super_admin',
        status: user.status === 'disabled' ? 'disabled' : 'active',
      })
      .onConflictDoNothing({ target: admins.email });
  }

  const devEmail = 'admin@lianchuan.local';
  const [existingDev] = await db.select().from(admins).where(eq(admins.email, devEmail)).limit(1);
  if (!existingDev) {
    await db.insert(admins).values({
      email: devEmail,
      passwordHash: md5Hash('Admin123456'),
      name: 'Admin User',
      role: 'super_admin',
      status: 'active',
    });
  }

  if (adminUsers.length > 0) {
    for (const user of adminUsers) {
      try {
        await db.delete(users).where(eq(users.id, user.id));
      } catch {
        await db.update(users).set({ role: 'customer' as never }).where(eq(users.id, user.id));
        console.warn(`Could not delete admin user ${user.email}; downgraded role to customer.`);
      }
    }
  }

  console.log(`Migrated ${adminUsers.length} admin user(s) to admins table.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
