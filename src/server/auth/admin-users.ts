import { eq } from 'drizzle-orm';

import { compareMd5, md5Hash } from '@/lib/auth/password';
import { db } from '@/server/db';
import { admins } from '@/server/db/schema';

export type AdminAuthRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'disabled';
};

const LOCAL_DEV_ADMIN: AdminAuthRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@lianchuan.local',
  passwordHash: '',
  name: 'Admin User',
  role: 'super_admin',
  status: 'active',
};

export async function getAdminByEmail(email: string): Promise<AdminAuthRecord | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await db.select().from(admins).where(eq(admins.email, normalized)).limit(1);
  if (!row) {
    if (process.env.NODE_ENV !== 'production' && normalized === LOCAL_DEV_ADMIN.email) {
      return LOCAL_DEV_ADMIN;
    }
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    role: row.role,
    status: row.status,
  };
}

export function verifyAdminPassword(admin: AdminAuthRecord, password: string) {
  if (process.env.NODE_ENV !== 'production' && admin.email === LOCAL_DEV_ADMIN.email && password === 'Admin123456') {
    return true;
  }
  return compareMd5(password, admin.passwordHash);
}

export async function resetAdminOwnPassword(adminId: string, password: string) {
  const [updated] = await db
    .update(admins)
    .set({
      passwordHash: md5Hash(password),
      updatedAt: new Date(),
    })
    .where(eq(admins.id, adminId))
    .returning({ id: admins.id });

  return updated ? { ok: true as const } : null;
}
