import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { z } from 'zod';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import { createBusinessPublicKey, normalizeBusinessPublicKey } from '@/lib/business-public-key';
import {
  type AdminCouponDetail,
  type AdminCouponListItem,
  type AdminCouponPayload,
  type AdminCouponSendPayload,
  type CouponBatchListQuery,
  type CouponDiscountType,
  type CouponGrantListQuery,
  type CouponListQuery,
  type CouponLocalePricing,
  type CouponLocalePricingInput,
  couponDiscountTypes,
  couponScopes,
  couponStatuses,
} from '@/lib/coupon-list-query';
import { getAdminSiteLanguages } from '@/server/admin/languages';
import { db } from '@/server/db';
import {
  admins,
  couponBrands,
  couponCategories,
  couponDistributionBatches,
  couponGrants,
  couponLocalePricing,
  couponProducts,
  coupons,
  users,
} from '@/server/db/schema';

const BATCH_SIZE = 200;

const localePricingItemSchema = z.object({
  locale: z.string().trim().min(1),
  thresholdAmount: z.coerce.number().min(0).nullable().optional(),
  discountValue: z.coerce.number().positive(),
  maxDiscountAmount: z.coerce.number().min(0).nullable().optional(),
});

export const adminCouponPayloadSchema = z.object({
  name: z.string().trim().min(1),
  couponKey: z.string().trim().optional(),
  scope: z.enum(couponScopes),
  stackable: z.boolean().optional(),
  discountType: z.enum(couponDiscountTypes),
  localePricing: z.array(localePricingItemSchema).min(1),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  status: z.enum(couponStatuses).optional(),
  note: z.string().trim().nullable().optional(),
  totalQuota: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().positive().nullable().optional(),
  grantOnRegister: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  brandIds: z.array(z.string().uuid()).optional(),
  productIds: z.array(z.string().uuid()).optional(),
}).superRefine((value, ctx) => {
  if (value.scope === 'category' && !(value.categoryIds?.length)) {
    ctx.addIssue({ code: 'custom', message: '请选择至少一个分类', path: ['categoryIds'] });
  }
  if (value.scope === 'brand' && !(value.brandIds?.length)) {
    ctx.addIssue({ code: 'custom', message: '请选择至少一个品牌', path: ['brandIds'] });
  }
  if (value.scope === 'product' && !(value.productIds?.length)) {
    ctx.addIssue({ code: 'custom', message: '请选择至少一个商品', path: ['productIds'] });
  }
  if (value.discountType === 'special_price' && value.scope !== 'product') {
    ctx.addIssue({ code: 'custom', message: '特价券仅适用于指定商品', path: ['discountType'] });
  }

  const hasValidPricing = value.localePricing.some((item) => item.discountValue > 0);
  if (!hasValidPricing) {
    ctx.addIssue({ code: 'custom', message: '请至少为一个语言填写优惠幅度', path: ['localePricing'] });
  }

  for (const [index, item] of value.localePricing.entries()) {
    if (value.discountType === 'fixed_amount' && item.thresholdAmount === undefined) {
      ctx.addIssue({ code: 'custom', message: '满减券需填写优惠门槛', path: ['localePricing', index, 'thresholdAmount'] });
    }
    if (value.discountType === 'percent' && (item.discountValue <= 0 || item.discountValue > 100)) {
      ctx.addIssue({ code: 'custom', message: '折扣幅度需在 0-100 之间', path: ['localePricing', index, 'discountValue'] });
    }
  }

  if (value.startsAt && value.endsAt && new Date(value.endsAt) < new Date(value.startsAt)) {
    ctx.addIssue({ code: 'custom', message: '结束时间不能早于开始时间', path: ['endsAt'] });
  }
});

export type AdminCouponListPage = {
  items: AdminCouponListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

async function getPrimaryDisplayLocale() {
  const languages = await getAdminSiteLanguages();
  const active = languages.filter((language) => language.status === 'active');
  return active[0]?.code ?? 'en';
}

async function getLocaleCurrencyMap() {
  const languages = await getAdminSiteLanguages();
  return new Map(languages.map((language) => [language.code, language.currencyCode]));
}

function mapLocalePricingRow(row: typeof couponLocalePricing.$inferSelect): CouponLocalePricing {
  return {
    locale: row.locale,
    thresholdAmount: row.thresholdAmount,
    discountValue: row.discountValue,
    maxDiscountAmount: row.maxDiscountAmount,
  };
}

async function loadLocalePricingMap(couponIds: string[]) {
  if (!couponIds.length) return new Map<string, CouponLocalePricing[]>();

  const rows = await db
    .select()
    .from(couponLocalePricing)
    .where(inArray(couponLocalePricing.couponId, couponIds));

  const map = new Map<string, CouponLocalePricing[]>();
  for (const row of rows) {
    const list = map.get(row.couponId) ?? [];
    list.push(mapLocalePricingRow(row));
    map.set(row.couponId, list);
  }
  return map;
}

function pickDisplayPricing(
  pricingRows: CouponLocalePricing[],
  primaryLocale: string,
): CouponLocalePricing | null {
  if (!pricingRows.length) return null;
  return pricingRows.find((row) => row.locale === primaryLocale) ?? pricingRows[0] ?? null;
}

function mapListRow(
  row: typeof coupons.$inferSelect,
  pricing: CouponLocalePricing | null,
  currencyCode: string,
): AdminCouponListItem {
  return {
    id: row.id,
    name: row.name,
    couponKey: row.couponKey,
    scope: row.scope,
    discountType: row.discountType,
    discountValue: pricing?.discountValue ?? '0',
    displayCurrencyCode: currencyCode,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    totalQuota: row.totalQuota,
    issuedQuantity: row.issuedQuantity,
    perUserLimit: row.perUserLimit,
    grantOnRegister: row.grantOnRegister,
    stackable: row.stackable,
    createdAt: row.createdAt,
  };
}

function getRemainingQuota(row: Pick<typeof coupons.$inferSelect, 'totalQuota' | 'issuedQuantity'>) {
  if (row.totalQuota == null) return null;
  return Math.max(0, row.totalQuota - row.issuedQuantity);
}

function isCouponActiveForGrant(row: typeof coupons.$inferSelect, at = new Date()) {
  if (row.status !== 'active') return false;
  if (row.startsAt && row.startsAt > at) return false;
  if (row.endsAt && row.endsAt < at) return false;
  const remaining = getRemainingQuota(row);
  if (remaining !== null && remaining <= 0) return false;
  return true;
}

async function generateUniqueCouponKey() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createBusinessPublicKey('CPN');
    const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.couponKey, candidate)).limit(1);
    if (!existing) return candidate;
  }
  throw new Error('无法生成唯一优惠券 Key');
}

async function loadRelationIds(couponId: string) {
  const [categoryRows, brandRows, productRows] = await Promise.all([
    db.select({ id: couponCategories.categoryId }).from(couponCategories).where(eq(couponCategories.couponId, couponId)),
    db.select({ id: couponBrands.brandId }).from(couponBrands).where(eq(couponBrands.couponId, couponId)),
    db.select({ id: couponProducts.productId }).from(couponProducts).where(eq(couponProducts.couponId, couponId)),
  ]);

  return {
    categoryIds: categoryRows.map((row) => row.id),
    brandIds: brandRows.map((row) => row.id),
    productIds: productRows.map((row) => row.id),
  };
}

async function syncCouponRelations(couponId: string, input: AdminCouponPayload) {
  await Promise.all([
    db.delete(couponCategories).where(eq(couponCategories.couponId, couponId)),
    db.delete(couponBrands).where(eq(couponBrands.couponId, couponId)),
    db.delete(couponProducts).where(eq(couponProducts.couponId, couponId)),
  ]);

  if (input.scope === 'category' && input.categoryIds?.length) {
    await db.insert(couponCategories).values(input.categoryIds.map((categoryId) => ({ couponId, categoryId })));
  }
  if (input.scope === 'brand' && input.brandIds?.length) {
    await db.insert(couponBrands).values(input.brandIds.map((brandId) => ({ couponId, brandId })));
  }
  if (input.scope === 'product' && input.productIds?.length) {
    await db.insert(couponProducts).values(input.productIds.map((productId) => ({ couponId, productId })));
  }
}

function buildLocalePricingValues(
  discountType: CouponDiscountType,
  items: CouponLocalePricingInput[],
) {
  return items.map((item) => ({
    locale: item.locale,
    thresholdAmount: discountType === 'fixed_amount' ? String(item.thresholdAmount ?? 0) : null,
    discountValue: String(item.discountValue),
    maxDiscountAmount: discountType === 'percent' && item.maxDiscountAmount != null
      ? String(item.maxDiscountAmount)
      : null,
  }));
}

async function syncCouponLocalePricing(couponId: string, discountType: CouponDiscountType, items: CouponLocalePricingInput[]) {
  await db.delete(couponLocalePricing).where(eq(couponLocalePricing.couponId, couponId));
  const values = buildLocalePricingValues(discountType, items);
  if (!values.length) return;
  await db.insert(couponLocalePricing).values(values.map((value) => ({
    couponId,
    ...value,
  })));
}

function buildCouponValues(input: AdminCouponPayload, couponKey: string) {
  return {
    name: input.name.trim(),
    couponKey,
    scope: input.scope,
    stackable: input.stackable ?? false,
    discountType: input.discountType,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    status: input.status ?? 'inactive',
    note: input.note?.trim() || null,
    totalQuota: input.totalQuota ?? null,
    perUserLimit: input.perUserLimit ?? null,
    grantOnRegister: input.grantOnRegister ?? false,
    updatedAt: new Date(),
  };
}

export async function listAdminCoupons(query: CouponListQuery): Promise<AdminCouponListPage> {
  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const offset = (page - 1) * pageSize;

  const filters = [];
  const keyword = query.keyword.trim();
  if (keyword) {
    const pattern = `%${keyword}%`;
    filters.push(or(ilike(coupons.name, pattern), ilike(coupons.couponKey, pattern)));
  }
  if (query.scope) filters.push(eq(coupons.scope, query.scope));
  if (query.discountType) filters.push(eq(coupons.discountType, query.discountType));
  if (query.status) filters.push(eq(coupons.status, query.status));

  const whereClause = filters.length ? and(...filters) : undefined;

  const [rows, totalRow, primaryLocale, currencyMap] = await Promise.all([
    db.select().from(coupons).where(whereClause).orderBy(desc(coupons.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(coupons).where(whereClause),
    getPrimaryDisplayLocale(),
    getLocaleCurrencyMap(),
  ]);

  const pricingMap = await loadLocalePricingMap(rows.map((row) => row.id));
  const primaryCurrency = currencyMap.get(primaryLocale) ?? 'USD';

  return {
    items: rows.map((row) => {
      const pricing = pickDisplayPricing(pricingMap.get(row.id) ?? [], primaryLocale);
      const currencyCode = pricing ? (currencyMap.get(pricing.locale) ?? primaryCurrency) : primaryCurrency;
      return mapListRow(row, pricing, currencyCode);
    }),
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getAdminCouponDetail(id: string): Promise<AdminCouponDetail | null> {
  const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!row) return null;

  const [relations, pricingMap, primaryLocale, currencyMap] = await Promise.all([
    loadRelationIds(id),
    loadLocalePricingMap([id]),
    getPrimaryDisplayLocale(),
    getLocaleCurrencyMap(),
  ]);

  const localePricing = pricingMap.get(id) ?? [];
  const displayPricing = pickDisplayPricing(localePricing, primaryLocale);
  const currencyCode = displayPricing
    ? (currencyMap.get(displayPricing.locale) ?? 'USD')
    : (currencyMap.get(primaryLocale) ?? 'USD');

  const listItem = mapListRow(row, displayPricing, currencyCode);

  return {
    ...listItem,
    note: row.note,
    localePricing,
    ...relations,
  };
}

export async function createAdminCoupon(input: AdminCouponPayload) {
  const couponKey = input.couponKey?.trim()
    ? normalizeBusinessPublicKey(input.couponKey)
    : await generateUniqueCouponKey();

  if (input.couponKey?.trim()) {
    const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.couponKey, couponKey)).limit(1);
    if (existing) throw new Error('优惠券 Key 已存在');
  }

  const [created] = await db.insert(coupons).values({
    ...buildCouponValues(input, couponKey),
    issuedQuantity: 0,
  }).returning();

  if (!created) throw new Error('创建优惠券失败');

  await Promise.all([
    syncCouponRelations(created.id, input),
    syncCouponLocalePricing(created.id, input.discountType, input.localePricing),
  ]);
  return getAdminCouponDetail(created.id);
}

export async function updateAdminCoupon(id: string, input: AdminCouponPayload) {
  const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!existing) return null;

  if (input.totalQuota != null && input.totalQuota < existing.issuedQuantity) {
    throw new Error('总张数不能小于已发放数量');
  }

  let couponKey = existing.couponKey;
  if (input.couponKey?.trim()) {
    couponKey = normalizeBusinessPublicKey(input.couponKey);
    if (couponKey !== existing.couponKey) {
      const [duplicate] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.couponKey, couponKey)).limit(1);
      if (duplicate && duplicate.id !== id) throw new Error('优惠券 Key 已存在');
    }
  }

  await db.update(coupons).set(buildCouponValues(input, couponKey)).where(eq(coupons.id, id));
  await Promise.all([
    syncCouponRelations(id, input),
    syncCouponLocalePricing(id, input.discountType, input.localePricing),
  ]);
  return getAdminCouponDetail(id);
}

export async function deleteAdminCoupon(id: string) {
  const [deleted] = await db.delete(coupons).where(eq(coupons.id, id)).returning({ id: coupons.id });
  return Boolean(deleted);
}

export async function toggleAdminCouponStatus(id: string) {
  const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!row) return null;
  const nextStatus = row.status === 'active' ? 'inactive' : 'active';
  await db.update(coupons).set({ status: nextStatus, updatedAt: new Date() }).where(eq(coupons.id, id));
  return getAdminCouponDetail(id);
}

type GrantRecipient = { userId: string; quantity: number };

async function grantCouponRecipients(input: {
  couponId: string;
  recipients: GrantRecipient[];
  source: 'admin_send' | 'registration';
  adminId?: string | null;
  batchId?: string | null;
}) {
  if (!input.recipients.length) return { granted: 0, recipientCount: 0, skipped: [] as string[], partial: false };

  return db.transaction(async (tx) => {
    const [coupon] = await tx.select().from(coupons).where(eq(coupons.id, input.couponId)).limit(1);
    if (!coupon) throw new Error('优惠券不存在');

    const skipped: string[] = [];
    const toInsert: GrantRecipient[] = [];
    let totalQuantity = 0;
    let remaining = getRemainingQuota(coupon);

    for (const recipient of input.recipients) {
      if (recipient.quantity < 1) {
        skipped.push(recipient.userId);
        continue;
      }

      if (input.source === 'registration' || input.source === 'admin_send') {
        if (!isCouponActiveForGrant(coupon)) {
          skipped.push(recipient.userId);
          continue;
        }
      }

      const current = await tx
        .select({ total: sum(couponGrants.quantity) })
        .from(couponGrants)
        .where(and(eq(couponGrants.couponId, input.couponId), eq(couponGrants.userId, recipient.userId)));
      const grantedSoFar = Number(current[0]?.total ?? 0);

      if (coupon.perUserLimit != null && grantedSoFar + recipient.quantity > coupon.perUserLimit) {
        skipped.push(recipient.userId);
        continue;
      }

      if (remaining !== null && recipient.quantity > remaining) {
        if (remaining <= 0) {
          skipped.push(recipient.userId);
          continue;
        }
        toInsert.push({ userId: recipient.userId, quantity: remaining });
        totalQuantity += remaining;
        remaining = 0;
        continue;
      }

      toInsert.push(recipient);
      totalQuantity += recipient.quantity;
      if (remaining !== null) remaining -= recipient.quantity;
    }

    if (!toInsert.length) {
      return { granted: 0, recipientCount: 0, skipped, partial: remaining === 0 };
    }

    await tx.insert(couponGrants).values(toInsert.map((recipient) => ({
      couponId: input.couponId,
      userId: recipient.userId,
      quantity: recipient.quantity,
      source: input.source,
      batchId: input.batchId ?? null,
      adminId: input.adminId ?? null,
    })));

    await tx.update(coupons).set({
      issuedQuantity: sql`${coupons.issuedQuantity} + ${totalQuantity}`,
      updatedAt: new Date(),
    }).where(eq(coupons.id, input.couponId));

    return {
      granted: totalQuantity,
      recipientCount: toInsert.length,
      skipped,
      partial: remaining === 0 && skipped.length > 0,
    };
  });
}

export async function sendCouponToCustomers(couponId: string, adminId: string, payload: AdminCouponSendPayload) {
  const quantityPerUser = Math.max(1, Math.trunc(payload.quantityPerUser));

  let userIds: string[] = [];
  if (payload.targetMode === 'selected_customers') {
    userIds = [...new Set(payload.userIds ?? [])];
    if (!userIds.length) throw new Error('请选择至少一位客户');
  } else {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'customer'), eq(users.status, 'active')));
    userIds = rows.map((row) => row.id);
  }

  const [batch] = await db.insert(couponDistributionBatches).values({
    couponId,
    adminId,
    targetMode: payload.targetMode,
    quantityPerUser,
    recipientCount: 0,
    totalQuantity: 0,
    note: payload.note?.trim() || null,
  }).returning();

  if (!batch) throw new Error('创建发放批次失败');

  let totalGranted = 0;
  let totalRecipients = 0;
  const allSkipped: string[] = [];

  for (let index = 0; index < userIds.length; index += BATCH_SIZE) {
    const chunk = userIds.slice(index, index + BATCH_SIZE);
    const result = await grantCouponRecipients({
      couponId,
      recipients: chunk.map((userId) => ({ userId, quantity: quantityPerUser })),
      source: 'admin_send',
      adminId,
      batchId: batch.id,
    });
    totalGranted += result.granted;
    totalRecipients += result.recipientCount ?? 0;
    allSkipped.push(...result.skipped);
  }

  await db.update(couponDistributionBatches).set({
    recipientCount: totalRecipients,
    totalQuantity: totalGranted,
  }).where(eq(couponDistributionBatches.id, batch.id));

  return {
    batchId: batch.id,
    recipientCount: totalRecipients,
    totalQuantity: totalGranted,
    skippedUserIds: [...new Set(allSkipped)],
    partial: allSkipped.length > 0,
  };
}

export async function grantRegistrationCoupons(userId: string) {
  const rows = await db.select().from(coupons).where(and(eq(coupons.grantOnRegister, true), eq(coupons.status, 'active')));

  for (const coupon of rows) {
    if (!isCouponActiveForGrant(coupon)) continue;
    await grantCouponRecipients({
      couponId: coupon.id,
      recipients: [{ userId, quantity: 1 }],
      source: 'registration',
    }).catch((error) => {
      console.error('[coupons] grantRegistrationCoupons failed:', coupon.id, error);
    });
  }
}

export async function listCouponDistributionBatches(couponId: string, query: CouponBatchListQuery) {
  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const offset = (page - 1) * pageSize;

  const whereClause = eq(couponDistributionBatches.couponId, couponId);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: couponDistributionBatches.id,
        targetMode: couponDistributionBatches.targetMode,
        quantityPerUser: couponDistributionBatches.quantityPerUser,
        recipientCount: couponDistributionBatches.recipientCount,
        totalQuantity: couponDistributionBatches.totalQuantity,
        note: couponDistributionBatches.note,
        createdAt: couponDistributionBatches.createdAt,
        adminEmail: admins.email,
      })
      .from(couponDistributionBatches)
      .innerJoin(admins, eq(couponDistributionBatches.adminId, admins.id))
      .where(whereClause)
      .orderBy(desc(couponDistributionBatches.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(couponDistributionBatches).where(whereClause),
  ]);

  return {
    items: rows,
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function listCouponGrants(couponId: string, query: CouponGrantListQuery) {
  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const offset = (page - 1) * pageSize;

  const filters = [eq(couponGrants.couponId, couponId)];
  if (query.source) filters.push(eq(couponGrants.source, query.source));
  if (query.batchId) filters.push(eq(couponGrants.batchId, query.batchId));

  const whereClause = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: couponGrants.id,
        quantity: couponGrants.quantity,
        source: couponGrants.source,
        batchId: couponGrants.batchId,
        createdAt: couponGrants.createdAt,
        userId: users.id,
        fullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        adminEmail: admins.email,
      })
      .from(couponGrants)
      .innerJoin(users, eq(couponGrants.userId, users.id))
      .leftJoin(admins, eq(couponGrants.adminId, admins.id))
      .where(whereClause)
      .orderBy(desc(couponGrants.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(couponGrants).where(whereClause),
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      fullName: row.fullName.trim(),
    })),
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export function getCouponQuotaSummary(item: Pick<AdminCouponListItem, 'totalQuota' | 'issuedQuantity'>) {
  if (item.totalQuota == null) {
    return { label: `${item.issuedQuantity}/不限`, remaining: null, exhausted: false };
  }
  const remaining = Math.max(0, item.totalQuota - item.issuedQuantity);
  return {
    label: `${item.issuedQuantity}/${item.totalQuota}`,
    remaining,
    exhausted: remaining <= 0,
  };
}
