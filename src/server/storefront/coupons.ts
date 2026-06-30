import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { formatCouponDiscountSummary, couponScopeLabels } from '@/lib/admin-display';
import { COUPON_CODE_PATTERN, type CouponDiscountType } from '@/lib/coupon-list-query';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import { db } from '@/server/db';
import {
  couponBrands,
  couponCategories,
  couponLocalePricing,
  couponProducts,
  coupons,
  productCategories,
  products,
} from '@/server/db/schema';

export type CartLineForCoupon = {
  productId: string;
  lineSubtotal: number;
  unitPrice: number;
  quantity: number;
};

export type StorefrontCouponSummary = {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  isApplied: boolean;
  message: string | null;
  discountAmount: number;
  couponId: string;
  couponName: string;
  discountValue: string;
  scopeSummary: string;
};

type LoadedCoupon = typeof coupons.$inferSelect;

type CouponRelations = {
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
};

type CouponPricing = {
  locale: string;
  thresholdAmount: string | null;
  discountValue: string;
  maxDiscountAmount: string | null;
};

function formatMoney(amount: string | number, currencyCode = 'USD') {
  const numeric = Number(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(numeric);
}

export function normalizeCouponCode(couponCode?: string | null) {
  const trimmed = couponCode?.trim();
  return trimmed || null;
}

function isCouponActive(row: LoadedCoupon, at = new Date()) {
  if (row.status !== 'active') return false;
  if (row.startsAt && row.startsAt > at) return false;
  if (row.endsAt && row.endsAt < at) return false;
  return true;
}

function pickLocalePricing(rows: CouponPricing[], locale: Locale): CouponPricing | null {
  if (!rows.length) return null;
  return rows.find((row) => row.locale === locale) ?? rows[0] ?? null;
}

function buildScopeSummary(scope: LoadedCoupon['scope']) {
  return couponScopeLabels[scope];
}

function buildCouponDescription(
  coupon: LoadedCoupon,
  pricing: CouponPricing,
  currencyCode: string,
) {
  const discountSummary = formatCouponDiscountSummary({
    discountType: coupon.discountType,
    discountValue: pricing.discountValue,
    defaultCurrencyCode: currencyCode,
  });

  if (coupon.discountType === 'fixed_amount' && pricing.thresholdAmount != null) {
    const threshold = formatMoney(pricing.thresholdAmount, currencyCode);
    return `${coupon.name} — ${discountSummary} off orders over ${threshold}`;
  }

  if (coupon.discountType === 'direct_amount') {
    return `${coupon.name} — ${discountSummary} off`;
  }

  if (coupon.discountType === 'percent') {
    return `${coupon.name} — ${discountSummary} off`;
  }

  if (coupon.discountType === 'special_price') {
    return `${coupon.name} — special price ${discountSummary}`;
  }

  return coupon.name;
}

async function loadCouponRelations(couponId: string): Promise<CouponRelations> {
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

async function loadCouponPricing(couponId: string) {
  const rows = await db
    .select({
      locale: couponLocalePricing.locale,
      thresholdAmount: couponLocalePricing.thresholdAmount,
      discountValue: couponLocalePricing.discountValue,
      maxDiscountAmount: couponLocalePricing.maxDiscountAmount,
    })
    .from(couponLocalePricing)
    .where(eq(couponLocalePricing.couponId, couponId));

  return rows;
}

async function loadProductScopeMeta(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, { brandId: string | null; categoryIds: string[] }>();
  }

  const [productRows, categoryRows] = await Promise.all([
    db
      .select({ id: products.id, brandId: products.brandId })
      .from(products)
      .where(inArray(products.id, productIds)),
    db
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(inArray(productCategories.productId, productIds)),
  ]);

  const map = new Map<string, { brandId: string | null; categoryIds: string[] }>();
  for (const row of productRows) {
    map.set(row.id, { brandId: row.brandId, categoryIds: [] });
  }
  for (const row of categoryRows) {
    const entry = map.get(row.productId);
    if (entry) {
      entry.categoryIds.push(row.categoryId);
    }
  }
  return map;
}

function lineMatchesScope(
  line: CartLineForCoupon,
  productMeta: { brandId: string | null; categoryIds: string[] },
  coupon: LoadedCoupon,
  relations: CouponRelations,
) {
  if (coupon.scope === 'all') return true;
  if (coupon.scope === 'product') return relations.productIds.includes(line.productId);
  if (coupon.scope === 'brand') return productMeta.brandId != null && relations.brandIds.includes(productMeta.brandId);
  if (coupon.scope === 'category') {
    return productMeta.categoryIds.some((categoryId) => relations.categoryIds.includes(categoryId));
  }
  return false;
}

function computeEligibleSubtotal(
  lines: CartLineForCoupon[],
  productMetaById: Map<string, { brandId: string | null; categoryIds: string[] }>,
  coupon: LoadedCoupon,
  relations: CouponRelations,
) {
  return lines.reduce((sum, line) => {
    const meta = productMetaById.get(line.productId);
    if (!meta || !lineMatchesScope(line, meta, coupon, relations)) {
      return sum;
    }
    return sum + line.lineSubtotal;
  }, 0);
}

function computeSpecialPriceDiscount(
  lines: CartLineForCoupon[],
  productMetaById: Map<string, { brandId: string | null; categoryIds: string[] }>,
  coupon: LoadedCoupon,
  relations: CouponRelations,
  specialPrice: number,
) {
  return lines.reduce((sum, line) => {
    const meta = productMetaById.get(line.productId);
    if (!meta || !lineMatchesScope(line, meta, coupon, relations)) {
      return sum;
    }
    const perUnitDiscount = Math.max(line.unitPrice - specialPrice, 0);
    return sum + perUnitDiscount * line.quantity;
  }, 0);
}

function computeDiscountAmount(input: {
  coupon: LoadedCoupon;
  pricing: CouponPricing;
  eligibleSubtotal: number;
  lines: CartLineForCoupon[];
  productMetaById: Map<string, { brandId: string | null; categoryIds: string[] }>;
  relations: CouponRelations;
}) {
  const { coupon, pricing, eligibleSubtotal } = input;
  const discountValue = Number(pricing.discountValue);

  if (eligibleSubtotal <= 0) {
    return 0;
  }

  switch (coupon.discountType) {
    case 'direct_amount':
      return Math.min(discountValue, eligibleSubtotal);
    case 'fixed_amount': {
      const threshold = Number(pricing.thresholdAmount ?? 0);
      if (eligibleSubtotal < threshold) {
        return 0;
      }
      return Math.min(discountValue, eligibleSubtotal);
    }
    case 'percent': {
      let amount = eligibleSubtotal * (discountValue / 100);
      if (pricing.maxDiscountAmount != null) {
        amount = Math.min(amount, Number(pricing.maxDiscountAmount));
      }
      return Math.min(amount, eligibleSubtotal);
    }
    case 'special_price':
      return computeSpecialPriceDiscount(
        input.lines,
        input.productMetaById,
        coupon,
        input.relations,
        discountValue,
      );
    default:
      return 0;
  }
}

function buildInactiveMessage(input: {
  coupon: LoadedCoupon;
  pricing: CouponPricing;
  eligibleSubtotal: number;
  cartSubtotal: number;
  currencyCode: string;
}) {
  const { coupon, pricing, eligibleSubtotal, cartSubtotal, currencyCode } = input;

  if (coupon.scope !== 'all' && eligibleSubtotal <= 0) {
    return 'This coupon does not apply to items in your cart.';
  }

  if (coupon.discountType === 'fixed_amount') {
    const threshold = Number(pricing.thresholdAmount ?? 0);
    if (eligibleSubtotal < threshold) {
      return `Requires eligible merchandise subtotal of ${formatMoney(threshold, currencyCode)}.`;
    }
  }

  if (cartSubtotal <= 0) {
    return 'Add items to your cart before applying this coupon.';
  }

  return 'This coupon cannot be applied to the current cart.';
}

export async function findCouponByCode(code: string) {
  const normalized = normalizeCouponCode(code);
  if (!normalized || !COUPON_CODE_PATTERN.test(normalized)) {
    return null;
  }

  const [row] = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  return row ?? null;
}

export async function resolveStorefrontCoupon(input: {
  code: string;
  locale?: string | null;
  currencyCode: string;
  cartSubtotal: number;
  lines: CartLineForCoupon[];
}): Promise<StorefrontCouponSummary | null> {
  const normalized = normalizeCouponCode(input.code);
  if (!normalized) {
    return null;
  }

  const coupon = await findCouponByCode(normalized);
  if (!coupon) {
    return {
      code: normalized,
      description: '',
      discountType: 'percent',
      isApplied: false,
      message: 'Coupon code is not recognized.',
      discountAmount: 0,
      couponId: '',
      couponName: normalized,
      discountValue: '0',
      scopeSummary: '',
    };
  }

  const locale = normalizeLocale(input.locale);
  const [relations, pricingRows] = await Promise.all([
    loadCouponRelations(coupon.id),
    loadCouponPricing(coupon.id),
  ]);
  const pricing = pickLocalePricing(pricingRows, locale);
  if (!pricing) {
    return {
      code: coupon.code,
      description: coupon.name,
      discountType: coupon.discountType,
      isApplied: false,
      message: 'Coupon pricing is not configured for your locale.',
      discountAmount: 0,
      couponId: coupon.id,
      couponName: coupon.name,
      discountValue: '0',
      scopeSummary: buildScopeSummary(coupon.scope),
    };
  }

  const productMetaById = await loadProductScopeMeta(input.lines.map((line) => line.productId));
  const eligibleSubtotal = computeEligibleSubtotal(input.lines, productMetaById, coupon, relations);
  const discountAmount = computeDiscountAmount({
    coupon,
    pricing,
    eligibleSubtotal,
    lines: input.lines,
    productMetaById,
    relations,
  });
  const description = buildCouponDescription(coupon, pricing, input.currencyCode);
  const active = isCouponActive(coupon);
  const isApplied = active && discountAmount > 0;

  let message: string | null = null;
  if (!active) {
    message = 'This coupon is not currently active.';
  } else if (!isApplied) {
    message = buildInactiveMessage({
      coupon,
      pricing,
      eligibleSubtotal,
      cartSubtotal: input.cartSubtotal,
      currencyCode: input.currencyCode,
    });
  }

  return {
    code: coupon.code,
    description,
    discountType: coupon.discountType,
    isApplied,
    message,
    discountAmount,
    couponId: coupon.id,
    couponName: coupon.name,
    discountValue: pricing.discountValue,
    scopeSummary: buildScopeSummary(coupon.scope),
  };
}

export async function validateCouponForApplication(input: {
  code: string;
  locale?: string | null;
  currencyCode: string;
  cartSubtotal: number;
  lines: CartLineForCoupon[];
}) {
  const normalized = normalizeCouponCode(input.code);
  if (!normalized || !COUPON_CODE_PATTERN.test(normalized)) {
    return { ok: false as const, error: 'INVALID_COUPON' as const, message: 'Coupon code is not recognized.' };
  }

  if (!input.lines.length) {
    return { ok: false as const, error: 'EMPTY_CART' as const, message: 'Add at least one item before applying a coupon.' };
  }

  const coupon = await findCouponByCode(normalized);
  if (!coupon || !isCouponActive(coupon)) {
    return { ok: false as const, error: 'INVALID_COUPON' as const, message: 'Coupon code is not recognized.' };
  }

  const summary = await resolveStorefrontCoupon({
    code: normalized,
    locale: input.locale,
    currencyCode: input.currencyCode,
    cartSubtotal: input.cartSubtotal,
    lines: input.lines,
  });

  if (!summary) {
    return { ok: false as const, error: 'INVALID_COUPON' as const, message: 'Coupon code is not recognized.' };
  }

  if (!summary.isApplied) {
    return {
      ok: false as const,
      error: 'COUPON_INELIGIBLE' as const,
      message: summary.message ?? 'This coupon cannot be applied to the current cart.',
    };
  }

  return { ok: true as const, coupon, summary };
}
