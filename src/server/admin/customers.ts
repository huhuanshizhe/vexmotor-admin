import { md5Hash } from '@/lib/auth/password';
import {
  createMemoryCustomer,
  getMemoryCustomer,
  listMemoryCustomers,
  updateMemoryCustomer,
} from '@/server/admin/memory-store';
import { db } from '@/server/db';
import { addresses, inquiries, orders, users, wishlists } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export type AdminCustomerRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'customer' | 'staff' | 'admin';
  status: 'active' | 'disabled' | 'pending';
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orderCount: number;
  inquiryCount: number;
  addressCount: number;
  wishlistCount: number;
  totalSpent: number;
};

export type AdminCustomerInput = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'customer' | 'staff' | 'admin';
  status: 'active' | 'disabled' | 'pending';
};

function mapMemoryCustomers(): AdminCustomerRow[] {
  return listMemoryCustomers();
}

export async function getAdminCustomers() {
  if (!db) {
    return mapMemoryCustomers();
  }

  try {
    const [customerRows, orderRows, inquiryRows, addressRows, wishlistRows] = await Promise.all([
      db.select().from(users),
      db.select({ userId: orders.userId, totalAmount: orders.totalAmount, status: orders.status }).from(orders),
      db.select({ userId: inquiries.userId }).from(inquiries),
      db.select({ userId: addresses.userId }).from(addresses),
      db.select({ userId: wishlists.userId }).from(wishlists),
    ]);

    const orderCountMap = new Map<string, number>();
    const totalSpentMap = new Map<string, number>();
    const inquiryCountMap = new Map<string, number>();
    const addressCountMap = new Map<string, number>();
    const wishlistCountMap = new Map<string, number>();

    for (const row of orderRows) {
      orderCountMap.set(row.userId, (orderCountMap.get(row.userId) ?? 0) + 1);
      if (row.status !== 'cancelled') {
        totalSpentMap.set(row.userId, (totalSpentMap.get(row.userId) ?? 0) + Number(row.totalAmount));
      }
    }

    for (const row of inquiryRows) {
      if (!row.userId) {
        continue;
      }

      inquiryCountMap.set(row.userId, (inquiryCountMap.get(row.userId) ?? 0) + 1);
    }

    for (const row of addressRows) {
      addressCountMap.set(row.userId, (addressCountMap.get(row.userId) ?? 0) + 1);
    }

    for (const row of wishlistRows) {
      wishlistCountMap.set(row.userId, (wishlistCountMap.get(row.userId) ?? 0) + 1);
    }

    return customerRows.map((item) => ({
      id: item.id,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      company: item.company,
      phone: item.phone,
      avatarUrl: item.avatarUrl,
      role: item.role,
      status: item.status,
      emailVerifiedAt: item.emailVerifiedAt,
      lastLoginAt: item.lastLoginAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      orderCount: orderCountMap.get(item.id) ?? 0,
      inquiryCount: inquiryCountMap.get(item.id) ?? 0,
      addressCount: addressCountMap.get(item.id) ?? 0,
      wishlistCount: wishlistCountMap.get(item.id) ?? 0,
      totalSpent: totalSpentMap.get(item.id) ?? 0,
    }));
  } catch {
    return mapMemoryCustomers();
  }
}

export async function getAdminCustomer(id: string) {
  const rows = await getAdminCustomers();
  return rows.find((item) => item.id === id) ?? getMemoryCustomer(id);
}

export async function createAdminCustomer(input: AdminCustomerInput) {
  if (!db) {
    return createMemoryCustomer({
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company ?? null,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role,
      status: input.status,
      emailVerifiedAt: input.status === 'active' ? new Date() : null,
      lastLoginAt: null,
      orderCount: 0,
      inquiryCount: 0,
      addressCount: 0,
      wishlistCount: 0,
      totalSpent: 0,
    });
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        email: input.email.trim().toLowerCase(),
        passwordHash: md5Hash('Temp123456'),
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company ?? null,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        role: input.role,
        status: input.status,
        emailVerifiedAt: input.status === 'active' ? new Date() : null,
      })
      .returning();

    return created ?? null;
  } catch {
    return createMemoryCustomer({
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company ?? null,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role,
      status: input.status,
      emailVerifiedAt: input.status === 'active' ? new Date() : null,
      lastLoginAt: null,
      orderCount: 0,
      inquiryCount: 0,
      addressCount: 0,
      wishlistCount: 0,
      totalSpent: 0,
    });
  }
}

export async function updateAdminCustomer(id: string, input: Partial<AdminCustomerInput>) {
  if (!db) {
    return updateMemoryCustomer(id, {
      email: input.email?.trim().toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      role: input.role,
      status: input.status,
      emailVerifiedAt: typeof input.status === 'undefined' ? undefined : input.status === 'active' ? new Date() : null,
    });
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        email: input.email?.trim().toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        role: input.role,
        status: input.status,
        emailVerifiedAt: typeof input.status === 'undefined' ? undefined : input.status === 'active' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated ?? null;
  } catch {
    return updateMemoryCustomer(id, {
      email: input.email?.trim().toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      role: input.role,
      status: input.status,
      emailVerifiedAt: typeof input.status === 'undefined' ? undefined : input.status === 'active' ? new Date() : null,
    });
  }
}
