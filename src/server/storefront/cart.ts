import { randomUUID } from 'node:crypto';

import { and, asc, eq, gt, inArray } from 'drizzle-orm';

import { calculateOrderPricing, type CommercePricingContext } from '@/lib/commerce-config';
import { convertViaBase, type ExchangeRateSnapshot } from '@/lib/currency-exchange';
import { DEFAULT_LOCALE, getMarketDefaults, normalizeLocale, type Locale } from '@/lib/i18n';
import { buildConfigurationLabel, type FeatureSelectionSnapshot } from '@/lib/product-feature-selection';
import { getVolumePricingForQuantity } from '@/lib/volume-pricing';
import { validateAndBuildFeatureSelections } from '@/server/admin/product-features';
import { getCommerceConfig } from '@/server/commerce/config';
import { getExchangeRateSnapshot } from '@/server/admin/exchange-rate-snapshot';
import { getCountryContinentByIso } from '@/server/geo/country-continents';
import { getSiteSettings } from '@/server/site/settings';
import { db } from '@/server/db';
import {
  loadProductTranslationsByProductIds,
  pickProductTranslation,
  resolveProductCoverImage,
} from '@/server/products/load-product-translations';
import { productCompareAtPriceSql, productCurrencyCodeSql, productNameSql, productPriceSql, productShortDescriptionSql, productSlugSql, productStockQuantitySql } from '@/server/products/resolve-product-translation';
import { addresses, cartItems, carts, orderCouponRedemptions, orderItems, orders, productImages, products, verificationTokens } from '@/server/db/schema';
import {
  normalizeCouponCode,
  resolveStorefrontCoupon,
  validateCouponForApplication,
  type CartLineForCoupon,
} from '@/server/storefront/coupons';

function cartLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

function formatMoney(amount: string | number, currencyCode = 'USD', locale: Locale = DEFAULT_LOCALE) {
  const numeric = Number(amount);
  const intlLocale = locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US';
  return {
    currency: currencyCode,
    amount: numeric,
    formatted: new Intl.NumberFormat(intlLocale, { style: 'currency', currency: currencyCode }).format(numeric),
  };
}

function convertToDisplayCurrency(
  amount: number,
  fromCurrency: string,
  displayCurrency: string,
  snapshot: ExchangeRateSnapshot,
) {
  const from = (fromCurrency || 'USD').trim().toUpperCase();
  const to = displayCurrency.trim().toUpperCase();
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (from === to) {
    return Number(amount.toFixed(2));
  }
  const converted = convertViaBase(amount, from, to, snapshot);
  return converted ?? Number(amount.toFixed(2));
}

function resolveTierUnitPrice(basePrice: number, currencyCode: string, quantity: number, volumePricingRules?: Parameters<typeof getVolumePricingForQuantity>[3]) {
  return getVolumePricingForQuantity(basePrice, currencyCode, quantity, volumePricingRules).unitPriceAmount;
}

async function resolveCommercePricingContext(currencyCode: string): Promise<CommercePricingContext> {
  const [exchangeSnapshot, countryContinentByIso] = await Promise.all([
    getExchangeRateSnapshot(),
    getCountryContinentByIso(),
  ]);
  return {
    targetCurrency: currencyCode,
    exchangeSnapshot,
    countryContinentByIso,
  };
}

async function buildCartPricingSummary(input: {
  subtotal: number;
  listSubtotal: number;
  couponCode: string | null;
  currencyCode: string;
  locale: Locale;
  lines: CartLineForCoupon[];
  commerceConfig: Awaited<ReturnType<typeof getCommerceConfig>>;
  defaultCountryCode: string;
  pricingContext: CommercePricingContext;
}) {
  const volumeDiscount = Math.max(input.listSubtotal - input.subtotal, 0);
  const coupon = input.couponCode
    ? await resolveStorefrontCoupon({
        code: input.couponCode,
        locale: input.locale,
        currencyCode: input.currencyCode,
        cartSubtotal: input.subtotal,
        lines: input.lines,
      })
    : null;
  const discount = coupon?.isApplied ? coupon.discountAmount : 0;
  const pricing = calculateOrderPricing(input.commerceConfig, {
    subtotal: input.subtotal,
    discountAmount: discount,
    countryCode: input.defaultCountryCode,
    shippingMethodCode: input.commerceConfig.defaultShippingMethodCode,
    pricingContext: input.pricingContext,
  });

  return {
    coupon,
    volumeDiscount,
    discount,
    shippingAmount: pricing.shippingAmount,
    taxAmount: pricing.taxAmount,
    totalAmount: pricing.totalAmount,
    freeShippingThreshold: pricing.freeShippingThreshold ?? 0,
    remainingForFreeShipping: pricing.remainingForFreeShipping,
  };
}

type OrderAddressSnapshot = {
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  countryCode: string;
  state: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
};

export type { OrderStatus } from '@/lib/order-status';

function createOrderNumber() {
  return `VM-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

function getOrderTokenIdentifier(orderNumber: string) {
  return `order:${orderNumber}`;
}

export async function getOrCreateCart(input: { userId?: string | null; anonymousToken?: string | null }) {
  const [existing] = input.userId
    ? await db.select().from(carts).where(and(eq(carts.userId, input.userId), eq(carts.status, 'active'))).limit(1)
    : await db.select().from(carts).where(and(eq(carts.anonymousToken, input.anonymousToken ?? ''), eq(carts.status, 'active'))).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(carts)
    .values({
      userId: input.userId ?? null,
      anonymousToken: input.userId ? null : input.anonymousToken ?? null,
      status: 'active',
      currencyCode: 'USD',
    })
    .returning();

  return created ?? null;
}

export async function getExistingActiveCartDetail(input: { userId?: string | null; anonymousToken?: string | null; locale?: string | null }) {
  if (!input.userId && !input.anonymousToken) {
    return null;
  }

  const [existing] = input.userId
    ? await db.select().from(carts).where(and(eq(carts.userId, input.userId), eq(carts.status, 'active'))).limit(1)
    : await db.select().from(carts).where(and(eq(carts.anonymousToken, input.anonymousToken ?? ''), eq(carts.status, 'active'))).limit(1);

  return existing ? getCartDetail(existing.id, input.locale) : null;
}

export async function getActiveCartDetail(input: { userId?: string | null; anonymousToken?: string | null; locale?: string | null }) {
  const cart = await getOrCreateCart(input);
  if (!cart) {
    return null;
  }
  return getCartDetail(cart.id, input.locale);
}

function toPublicCouponSummary(coupon: Awaited<ReturnType<typeof resolveStorefrontCoupon>>) {
  if (!coupon) return null;
  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    isApplied: coupon.isApplied,
    message: coupon.message,
  };
}

export async function getCartDetail(cartId: string, localeInput?: string | null) {
  const locale = cartLocale(localeInput);
  const commerceConfig = await getCommerceConfig();

  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) return null;

  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      unitPrice: cartItems.unitPrice,
      subtotal: cartItems.subtotal,
      configurationKey: cartItems.configurationKey,
      featureSelections: cartItems.featureSelections,
      productName: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      shortDescription: productShortDescriptionSql(products.id, locale),
      purchaseMode: products.purchaseMode,
      stockQuantity: productStockQuantitySql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      basePrice: productPriceSql(products.id, locale),
      compareAtPrice: productCompareAtPriceSql(products.id, locale),
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cartId));

  const productIds = items.map((item) => item.productId);
  const imageRows = productIds.length
    ? await db
        .select({
          productId: productImages.productId,
          id: productImages.id,
          url: productImages.url,
          alt: productImages.alt,
          width: productImages.width,
          height: productImages.height,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.productId), asc(productImages.sortOrder))
    : [];

  const firstImageByProductId = new Map<
    string,
    { id: string; url: string; alt: string; width: number | null; height: number | null }
  >();
  for (const row of imageRows) {
    if (!firstImageByProductId.has(row.productId)) {
      firstImageByProductId.set(row.productId, {
        id: row.id,
        url: row.url,
        alt: row.alt,
        width: row.width,
        height: row.height,
      });
    }
  }

  const translationsByProductId = await loadProductTranslationsByProductIds(productIds);

  const pricedItems = items.map((item) => {
    const basePriceAmount = Number(item.basePrice);
    const unitPriceAmount = resolveTierUnitPrice(
      basePriceAmount,
      item.currencyCode ?? 'USD',
      item.quantity,
      commerceConfig.volumePricingRules,
    );
    const lineSubtotal = Number((unitPriceAmount * item.quantity).toFixed(2));

    return {
      item,
      basePriceAmount,
      unitPriceAmount,
      lineSubtotal,
    };
  });

  const displayCurrency = getMarketDefaults(locale).currency;
  const [siteSettings, pricingContext] = await Promise.all([
    getSiteSettings(),
    resolveCommercePricingContext(displayCurrency),
  ]);

  const pricedItemsInDisplayCurrency = pricedItems.map((row) => {
    const itemCurrency = row.item.currencyCode ?? 'USD';
    const snapshot = pricingContext.exchangeSnapshot;
    const convert = (value: number) => convertToDisplayCurrency(value, itemCurrency, displayCurrency, snapshot);

    return {
      ...row,
      displayBasePrice: convert(row.basePriceAmount),
      displayUnitPrice: convert(row.unitPriceAmount),
      displayLineSubtotal: convert(row.lineSubtotal),
      displayListLineSubtotal: convert(row.basePriceAmount * row.item.quantity),
      displayCompareAtPrice: row.item.compareAtPrice ? convert(Number(row.item.compareAtPrice)) : null,
    };
  });

  const subtotal = pricedItemsInDisplayCurrency.reduce((sum, row) => sum + row.displayLineSubtotal, 0);
  const listSubtotal = pricedItemsInDisplayCurrency.reduce((sum, row) => sum + row.displayListLineSubtotal, 0);
  const couponLines: CartLineForCoupon[] = pricedItemsInDisplayCurrency.map(({ item, displayUnitPrice, displayLineSubtotal }) => ({
    productId: item.productId,
    lineSubtotal: displayLineSubtotal,
    unitPrice: displayUnitPrice,
    quantity: item.quantity,
  }));

  const summary = await buildCartPricingSummary({
    subtotal,
    listSubtotal,
    couponCode: cart.couponCode,
    currencyCode: displayCurrency,
    locale,
    lines: couponLines,
    commerceConfig,
    defaultCountryCode: siteSettings.defaultCountryCode,
    pricingContext,
  });

  return {
    id: cart.id,
    locale,
    items: pricedItemsInDisplayCurrency.map(({ item, displayBasePrice, displayUnitPrice, displayLineSubtotal, displayCompareAtPrice }) => {
      const featureSelections = (item.featureSelections ?? []) as FeatureSelectionSnapshot;
      const configurationLabel = buildConfigurationLabel(featureSelections);
      const translation = pickProductTranslation(translationsByProductId.get(item.productId), locale);
      const coverImage = resolveProductCoverImage(
        item.productId,
        item.productName,
        firstImageByProductId.get(item.productId),
        translation?.payload,
      );
      return {
        id: item.id,
        productId: item.productId,
        product: {
          id: item.productId,
          name: item.productName,
          slug: item.slug,
          spu: item.spu,
          shortDescription: item.shortDescription,
          price: formatMoney(displayBasePrice, displayCurrency, locale),
          compareAtPrice: displayCompareAtPrice ? formatMoney(displayCompareAtPrice, displayCurrency, locale) : null,
          purchaseMode: item.purchaseMode,
          inStock: item.stockQuantity > 0,
          brand: null,
          coverImage,
        },
        quantity: item.quantity,
        listUnitPrice: formatMoney(displayBasePrice, displayCurrency, locale),
        unitPrice: formatMoney(displayUnitPrice, displayCurrency, locale),
        subtotal: formatMoney(displayLineSubtotal, displayCurrency, locale),
        tierApplied: displayUnitPrice < displayBasePrice,
        configurationKey: item.configurationKey,
        featureSelections,
        configurationLabel,
        variantLabel: configurationLabel,
      };
    }),
    itemCount: pricedItemsInDisplayCurrency.reduce((sum, row) => sum + row.item.quantity, 0),
    couponCode: cart.couponCode,
    coupon: toPublicCouponSummary(summary.coupon),
    subtotal: formatMoney(subtotal, displayCurrency, locale),
    volumeDiscount: formatMoney(summary.volumeDiscount, displayCurrency, locale),
    discount: formatMoney(summary.discount, displayCurrency, locale),
    shipping: formatMoney(summary.shippingAmount, displayCurrency, locale),
    tax: formatMoney(summary.taxAmount, displayCurrency, locale),
    total: formatMoney(summary.totalAmount, displayCurrency, locale),
    freeShippingThreshold: formatMoney(summary.freeShippingThreshold, displayCurrency, locale),
    remainingForFreeShipping: formatMoney(summary.remainingForFreeShipping, displayCurrency, locale),
  };
}

export async function buildBuyNowCartPreview(input: {
  productId: string;
  quantity: number;
  locale?: string | null;
  featureValueIds?: string[];
}) {
  const locale = cartLocale(input.locale);
  const commerceConfig = await getCommerceConfig();
  const validation = await validateAndBuildFeatureSelections(
    input.productId,
    locale,
    input.featureValueIds ?? [],
  );
  if (!validation.ok) {
    return validation;
  }

  const [product] = await db
    .select({
      id: products.id,
      purchaseMode: products.purchaseMode,
      productName: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      shortDescription: productShortDescriptionSql(products.id, locale),
      stockQuantity: productStockQuantitySql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      basePrice: productPriceSql(products.id, locale),
      compareAtPrice: productCompareAtPriceSql(products.id, locale),
    })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);

  if (!product || product.purchaseMode !== 'buy') {
    return { ok: false as const, code: 'PRODUCT_NOT_AVAILABLE' as const, message: 'Product cannot be purchased directly' };
  }

  const quantity = Math.max(1, input.quantity);
  const productCurrency = product.currencyCode ?? 'USD';
  const displayCurrency = getMarketDefaults(locale).currency;
  const basePriceAmount = Number(product.basePrice);
  const unitPriceAmount = resolveTierUnitPrice(basePriceAmount, productCurrency, quantity, commerceConfig.volumePricingRules);
  const lineSubtotal = Number((unitPriceAmount * quantity).toFixed(2));
  const listSubtotal = basePriceAmount * quantity;

  const [imageRow] = await db
    .select({
      id: productImages.id,
      url: productImages.url,
      alt: productImages.alt,
      width: productImages.width,
      height: productImages.height,
    })
    .from(productImages)
    .where(eq(productImages.productId, input.productId))
    .orderBy(asc(productImages.sortOrder))
    .limit(1);

  const translationsByProductId = await loadProductTranslationsByProductIds([input.productId]);
  const translation = pickProductTranslation(translationsByProductId.get(input.productId), locale);
  const coverImage = resolveProductCoverImage(
    input.productId,
    product.productName,
    imageRow ? { id: imageRow.id, url: imageRow.url, alt: imageRow.alt, width: imageRow.width, height: imageRow.height } : undefined,
    translation?.payload,
  );

  const featureSelections = validation.featureSelections;
  const configurationLabel = buildConfigurationLabel(featureSelections);
  const couponLines: CartLineForCoupon[] = [{
    productId: input.productId,
    lineSubtotal,
    unitPrice: unitPriceAmount,
    quantity,
  }];
  const [siteSettings, pricingContext] = await Promise.all([
    getSiteSettings(),
    resolveCommercePricingContext(displayCurrency),
  ]);
  const snapshot = pricingContext.exchangeSnapshot;
  const displayBasePrice = convertToDisplayCurrency(basePriceAmount, productCurrency, displayCurrency, snapshot);
  const displayUnitPrice = convertToDisplayCurrency(unitPriceAmount, productCurrency, displayCurrency, snapshot);
  const displayLineSubtotal = convertToDisplayCurrency(lineSubtotal, productCurrency, displayCurrency, snapshot);
  const displayListSubtotal = convertToDisplayCurrency(listSubtotal, productCurrency, displayCurrency, snapshot);
  const displayCompareAtPrice = product.compareAtPrice
    ? convertToDisplayCurrency(Number(product.compareAtPrice), productCurrency, displayCurrency, snapshot)
    : null;
  const summary = await buildCartPricingSummary({
    subtotal: displayLineSubtotal,
    listSubtotal: displayListSubtotal,
    couponCode: null,
    currencyCode: displayCurrency,
    locale,
    lines: [{
      productId: input.productId,
      lineSubtotal: displayLineSubtotal,
      unitPrice: displayUnitPrice,
      quantity,
    }],
    commerceConfig,
    defaultCountryCode: siteSettings.defaultCountryCode,
    pricingContext,
  });

  const syntheticItemId = `buy-now-${input.productId}`;

  return {
    ok: true as const,
    detail: {
      id: 'buy-now-preview',
      locale,
      items: [{
        id: syntheticItemId,
        productId: input.productId,
        product: {
          id: input.productId,
          name: product.productName,
          slug: product.slug,
          spu: product.spu,
          shortDescription: product.shortDescription,
          price: formatMoney(displayBasePrice, displayCurrency, locale),
          compareAtPrice: displayCompareAtPrice ? formatMoney(displayCompareAtPrice, displayCurrency, locale) : null,
          purchaseMode: product.purchaseMode,
          inStock: product.stockQuantity > 0,
          brand: null,
          coverImage,
        },
        quantity,
        listUnitPrice: formatMoney(displayBasePrice, displayCurrency, locale),
        unitPrice: formatMoney(displayUnitPrice, displayCurrency, locale),
        subtotal: formatMoney(displayLineSubtotal, displayCurrency, locale),
        tierApplied: displayUnitPrice < displayBasePrice,
        configurationKey: validation.configurationKey,
        featureSelections,
        configurationLabel,
        variantLabel: configurationLabel,
      }],
      itemCount: quantity,
      couponCode: null,
      coupon: toPublicCouponSummary(summary.coupon),
      subtotal: formatMoney(displayLineSubtotal, displayCurrency, locale),
      volumeDiscount: formatMoney(summary.volumeDiscount, displayCurrency, locale),
      discount: formatMoney(summary.discount, displayCurrency, locale),
      shipping: formatMoney(summary.shippingAmount, displayCurrency, locale),
      tax: formatMoney(summary.taxAmount, displayCurrency, locale),
      total: formatMoney(summary.totalAmount, displayCurrency, locale),
      freeShippingThreshold: formatMoney(summary.freeShippingThreshold, displayCurrency, locale),
      remainingForFreeShipping: formatMoney(summary.remainingForFreeShipping, displayCurrency, locale),
    },
  };
}

export async function updateCartCoupon(cartId: string, couponCode?: string | null, localeInput?: string | null) {
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) {
    return { detail: null, error: 'CART_NOT_FOUND', message: 'Cart could not be found.' };
  }

  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (!normalizedCouponCode) {
    await db.update(carts).set({ couponCode: null, updatedAt: new Date() }).where(eq(carts.id, cartId));
    return { detail: await getCartDetail(cartId, localeInput), error: null, message: null };
  }

  const currentDetail = await getCartDetail(cartId, localeInput);
  if (!currentDetail || !currentDetail.items.length) {
    return { detail: null, error: 'EMPTY_CART', message: 'Add at least one item before applying a coupon.' };
  }

  const validation = await validateCouponForApplication({
    code: normalizedCouponCode,
    locale: localeInput,
    currencyCode: cart.currencyCode,
    cartSubtotal: currentDetail.subtotal.amount,
    lines: currentDetail.items.map((item) => ({
      productId: item.productId,
      lineSubtotal: item.subtotal.amount,
      unitPrice: item.unitPrice.amount,
      quantity: item.quantity,
    })),
  });

  if (!validation.ok) {
    return { detail: null, error: validation.error, message: validation.message };
  }

  await db.update(carts).set({ couponCode: normalizedCouponCode, updatedAt: new Date() }).where(eq(carts.id, cartId));
  return { detail: await getCartDetail(cartId, localeInput), error: null, message: null };
}

export async function addCartItem(input: {
  cartId: string;
  productId: string;
  quantity: number;
  locale?: string | null;
  featureValueIds?: string[];
}) {
  const locale = cartLocale(input.locale);
  const commerceConfig = await getCommerceConfig();
  const validation = await validateAndBuildFeatureSelections(
    input.productId,
    locale,
    input.featureValueIds ?? [],
  );
  if (!validation.ok) {
    return validation;
  }

  const [product] = await db
    .select({
      purchaseMode: products.purchaseMode,
      price: productPriceSql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
    })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!product || product.purchaseMode !== 'buy') {
    return { ok: false as const, code: 'PRODUCT_NOT_AVAILABLE' as const, message: 'Product cannot be added to cart' };
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(
      eq(cartItems.cartId, input.cartId),
      eq(cartItems.productId, input.productId),
      eq(cartItems.configurationKey, validation.configurationKey),
    ))
    .limit(1);

  const unitPriceBase = Number(product.price);
  if (existing) {
    const nextQuantity = existing.quantity + input.quantity;
    const unitPrice = resolveTierUnitPrice(unitPriceBase, product.currencyCode ?? 'USD', nextQuantity, commerceConfig.volumePricingRules);
    await db
      .update(cartItems)
      .set({
        quantity: nextQuantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: (nextQuantity * unitPrice).toFixed(2),
        featureSelections: validation.featureSelections,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, existing.id));
  } else {
    const unitPrice = resolveTierUnitPrice(unitPriceBase, product.currencyCode ?? 'USD', input.quantity, commerceConfig.volumePricingRules);
    await db.insert(cartItems).values({
      cartId: input.cartId,
      productId: input.productId,
      configurationKey: validation.configurationKey,
      featureSelections: validation.featureSelections,
      quantity: input.quantity,
      unitPrice: unitPrice.toFixed(2),
      subtotal: (input.quantity * unitPrice).toFixed(2),
    });
  }

  const detail = await getCartDetail(input.cartId, locale);
  if (!detail) {
    return { ok: false as const, code: 'CART_UNAVAILABLE' as const, message: 'Cart could not be loaded' };
  }
  return { ok: true as const, detail };
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const commerceConfig = await getCommerceConfig();
  const [existing] = await db.select().from(cartItems).where(eq(cartItems.id, itemId)).limit(1);
  if (!existing) {
    return null;
  }

  const [product] = await db
    .select({
      price: productPriceSql(products.id),
      currencyCode: productCurrencyCodeSql(products.id),
    })
    .from(products)
    .where(eq(products.id, existing.productId))
    .limit(1);
  const unitPriceBase = product ? Number(product.price) : Number(existing.unitPrice);
  const unitPrice = resolveTierUnitPrice(unitPriceBase, product?.currencyCode ?? 'USD', quantity, commerceConfig.volumePricingRules);

  await db
    .update(cartItems)
    .set({
      quantity,
      unitPrice: unitPrice.toFixed(2),
      subtotal: (unitPrice * quantity).toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(cartItems.id, itemId));

  return getCartDetail(existing.cartId);
}

export async function deleteCartItem(itemId: string) {
  const [deleted] = await db.delete(cartItems).where(eq(cartItems.id, itemId)).returning();
  if (!deleted) {
    return null;
  }
  return getCartDetail(deleted.cartId);
}

/** Mark the source cart converted only after checkout payment succeeds. */
export async function convertCartAfterOrderPaid(cartId: string | null | undefined) {
  if (!cartId) {
    return;
  }

  await db
    .update(carts)
    .set({ status: 'converted', updatedAt: new Date() })
    .where(and(eq(carts.id, cartId), eq(carts.status, 'active')));
}

function toOrderAddressSnapshot(input: OrderAddressSnapshot | typeof addresses.$inferSelect): OrderAddressSnapshot {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company ?? null,
    phone: input.phone ?? null,
    countryCode: input.countryCode,
    state: input.state ?? null,
    city: input.city,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    postalCode: input.postalCode,
  };
}

async function createGuestAccessToken(orderNumber: string) {
  const guestAccessToken = randomUUID();
  await db
    .insert(verificationTokens)
    .values({
      identifier: getOrderTokenIdentifier(orderNumber),
      token: guestAccessToken,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
    })
    .onConflictDoUpdate({
      target: verificationTokens.identifier,
      set: {
        token: guestAccessToken,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
      },
    });
  return guestAccessToken;
}

async function insertOrderFromCartDetail(input: {
  userId: string | null;
  cartId: string | null;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  shippingSnapshot: OrderAddressSnapshot;
  billingSnapshot: OrderAddressSnapshot;
  shippingMethod: string;
  paymentMethod: string;
  customerNote?: string;
  locale?: string | null;
  currencyCode: string;
  detail: NonNullable<Awaited<ReturnType<typeof getCartDetail>>>;
  pricing: ReturnType<typeof calculateOrderPricing>;
}) {
  const orderNumber = createOrderNumber();
  const composedCustomerNote = [
    input.detail.coupon?.isApplied ? `Coupon: ${input.detail.coupon.code}` : null,
    input.customerNote?.trim() || null,
  ].filter(Boolean).join('\n');

  const [createdOrder] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: input.userId,
      cartId: input.cartId,
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      status: 'unpaid',
      paymentStatus: 'unpaid',
      locale: normalizeLocale(input.locale),
      currencyCode: input.currencyCode,
      subtotal: input.detail.subtotal.amount.toFixed(2),
      shippingAmount: input.pricing.shippingAmount.toFixed(2),
      taxAmount: input.pricing.taxAmount.toFixed(2),
      discountAmount: input.detail.discount.amount.toFixed(2),
      totalAmount: input.pricing.totalAmount.toFixed(2),
      shippingMethod: input.pricing.selectedShippingOption?.title ?? input.shippingMethod,
      paymentMethod: input.paymentMethod,
      customerNote: composedCustomerNote || null,
      shippingAddressSnapshot: input.shippingSnapshot,
      billingAddressSnapshot: input.billingSnapshot,
      placedAt: new Date(),
    })
    .returning();

  if (!createdOrder) {
    return null;
  }

  await db.insert(orderItems).values(
    input.detail.items.map((item) => ({
      orderId: createdOrder.id,
      productId: item.productId,
      productName: item.product.name,
      spu: item.product.spu,
      variantLabel: item.configurationLabel || null,
      featureSelections: item.featureSelections,
      quantity: item.quantity,
      unitPrice: item.unitPrice.amount.toFixed(2),
      subtotal: item.subtotal.amount.toFixed(2),
    })),
  );

  const currentCart = input.cartId
    ? await db.select({ couponCode: carts.couponCode }).from(carts).where(eq(carts.id, input.cartId)).limit(1)
    : [];
  const couponCode = currentCart[0]?.couponCode;

  if (input.cartId && input.detail.coupon?.isApplied && couponCode) {
    const fullCoupon = await resolveStorefrontCoupon({
      code: couponCode,
      locale: input.locale,
      currencyCode: input.currencyCode,
      cartSubtotal: input.detail.subtotal.amount,
      lines: input.detail.items.map((item) => ({
        productId: item.productId,
        lineSubtotal: item.subtotal.amount,
        unitPrice: item.unitPrice.amount,
        quantity: item.quantity,
      })),
    });

    if (fullCoupon?.isApplied && fullCoupon.couponId) {
      await db.insert(orderCouponRedemptions).values({
        orderId: createdOrder.id,
        couponId: fullCoupon.couponId,
        couponCode: fullCoupon.code,
        couponName: fullCoupon.couponName,
        discountType: fullCoupon.discountType,
        discountValue: fullCoupon.discountValue,
        discountAmount: input.detail.discount.amount.toFixed(2),
        scopeSummary: fullCoupon.scopeSummary,
      });
    }
  }

  if (!input.userId) {
    const guestAccessToken = await createGuestAccessToken(orderNumber);
    return { ...createdOrder, guestAccessToken };
  }

  return createdOrder;
}

export async function createOrderFromCart(input: {
  userId?: string | null;
  cartId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingAddress?: OrderAddressSnapshot;
  billingAddress?: OrderAddressSnapshot;
  shippingMethod: string;
  paymentMethod: string;
  customerNote?: string;
  locale?: string | null;
}) {
  const commerceConfig = await getCommerceConfig();
  const [currentCart] = await db.select().from(carts).where(eq(carts.id, input.cartId)).limit(1);
  if (!currentCart) {
    return null;
  }

  const detail = await getCartDetail(input.cartId, input.locale);
  if (!detail || !detail.items.length) {
    return null;
  }

  if (input.userId) {
    if (!input.shippingAddressId || !input.billingAddressId) {
      return null;
    }

    const [ship, bill] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.id, input.shippingAddressId)).limit(1),
      db.select().from(addresses).where(eq(addresses.id, input.billingAddressId)).limit(1),
    ]);

    const shippingRow = ship[0];
    const billingRow = bill[0];
    if (!shippingRow || !billingRow || currentCart.userId !== input.userId) {
      return null;
    }
    if (shippingRow.userId !== input.userId || billingRow.userId !== input.userId) {
      return null;
    }

    const checkoutCurrency = detail.subtotal.currency;
    const pricingContext = await resolveCommercePricingContext(checkoutCurrency);
    const pricing = calculateOrderPricing(commerceConfig, {
      subtotal: detail.subtotal.amount,
      discountAmount: detail.discount.amount,
      countryCode: String(shippingRow.countryCode),
      shippingMethodCode: input.shippingMethod,
      pricingContext,
    });
    if (!pricing.selectedShippingOption) {
      return null;
    }

    return insertOrderFromCartDetail({
      userId: input.userId,
      cartId: input.cartId,
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      shippingSnapshot: toOrderAddressSnapshot(shippingRow),
      billingSnapshot: toOrderAddressSnapshot(billingRow),
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      customerNote: input.customerNote,
      locale: input.locale,
      currencyCode: checkoutCurrency,
      detail,
      pricing,
    });
  }

  if (!input.shippingAddress || !input.billingAddress) {
    return null;
  }
  if (currentCart.userId) {
    return null;
  }

  const shippingSnapshot = toOrderAddressSnapshot(input.shippingAddress);
  const billingSnapshot = toOrderAddressSnapshot(input.billingAddress);
  const checkoutCurrency = detail.subtotal.currency;
  const pricingContext = await resolveCommercePricingContext(checkoutCurrency);
  const pricing = calculateOrderPricing(commerceConfig, {
    subtotal: detail.subtotal.amount,
    discountAmount: detail.discount.amount,
    countryCode: shippingSnapshot.countryCode,
    shippingMethodCode: input.shippingMethod,
    pricingContext,
  });
  if (!pricing.selectedShippingOption) {
    return null;
  }

  return insertOrderFromCartDetail({
    userId: null,
    cartId: input.cartId,
    shippingAddressId: null,
    billingAddressId: null,
    shippingSnapshot,
    billingSnapshot,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    customerNote: input.customerNote,
    locale: input.locale,
    currencyCode: checkoutCurrency,
    detail,
    pricing,
  });
}

export async function createOrderFromBuyNowLine(input: {
  userId?: string | null;
  productId: string;
  quantity: number;
  featureValueIds?: string[];
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingAddress?: OrderAddressSnapshot;
  billingAddress?: OrderAddressSnapshot;
  shippingMethod: string;
  paymentMethod: string;
  customerNote?: string;
  locale?: string | null;
}) {
  const preview = await buildBuyNowCartPreview({
    productId: input.productId,
    quantity: input.quantity,
    locale: input.locale,
    featureValueIds: input.featureValueIds,
  });
  if (!preview.ok) {
    return null;
  }

  const detail = preview.detail;
  const commerceConfig = await getCommerceConfig();
  const currencyCode = detail.subtotal.currency;

  if (input.userId) {
    if (!input.shippingAddressId || !input.billingAddressId) {
      return null;
    }

    const [ship, bill] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.id, input.shippingAddressId)).limit(1),
      db.select().from(addresses).where(eq(addresses.id, input.billingAddressId)).limit(1),
    ]);

    const shippingRow = ship[0];
    const billingRow = bill[0];
    if (!shippingRow || !billingRow || shippingRow.userId !== input.userId || billingRow.userId !== input.userId) {
      return null;
    }

    const pricingContext = await resolveCommercePricingContext(currencyCode);
    const pricing = calculateOrderPricing(commerceConfig, {
      subtotal: detail.subtotal.amount,
      discountAmount: detail.discount.amount,
      countryCode: String(shippingRow.countryCode),
      shippingMethodCode: input.shippingMethod,
      pricingContext,
    });
    if (!pricing.selectedShippingOption) {
      return null;
    }

    return insertOrderFromCartDetail({
      userId: input.userId,
      cartId: null,
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      shippingSnapshot: toOrderAddressSnapshot(shippingRow),
      billingSnapshot: toOrderAddressSnapshot(billingRow),
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      customerNote: input.customerNote,
      locale: input.locale,
      currencyCode,
      detail,
      pricing,
    });
  }

  if (!input.shippingAddress || !input.billingAddress) {
    return null;
  }

  const shippingSnapshot = toOrderAddressSnapshot(input.shippingAddress);
  const billingSnapshot = toOrderAddressSnapshot(input.billingAddress);
  const pricingContext = await resolveCommercePricingContext(currencyCode);
  const pricing = calculateOrderPricing(commerceConfig, {
    subtotal: detail.subtotal.amount,
    discountAmount: detail.discount.amount,
    countryCode: shippingSnapshot.countryCode,
    shippingMethodCode: input.shippingMethod,
    pricingContext,
  });
  if (!pricing.selectedShippingOption) {
    return null;
  }

  return insertOrderFromCartDetail({
    userId: null,
    cartId: null,
    shippingAddressId: null,
    billingAddressId: null,
    shippingSnapshot,
    billingSnapshot,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    customerNote: input.customerNote,
    locale: input.locale,
    currencyCode,
    detail,
    pricing,
  });
}

export async function getGuestOrderDetailByNumber(orderNumber: string, guestAccessToken?: string | null) {
  if (!guestAccessToken) {
    return null;
  }

  const [tokenRecord] = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, getOrderTokenIdentifier(orderNumber)),
        eq(verificationTokens.token, guestAccessToken),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);
  if (!tokenRecord) {
    return null;
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) {
    return null;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const { enrichOrderItemsWithCoverImages } = await import('@/server/storefront/order-payment');
  return {
    ...order,
    items: await enrichOrderItemsWithCoverImages(items),
  };
}

export async function buildQuoteCartPreview(input: {
  quoteNumber: string;
  userId: string;
  locale?: string | null;
}) {
  const { getStorefrontInquiryForQuoteCheckout } = await import('@/server/storefront/inquiries');
  const locale = cartLocale(input.locale);
  const inquiry = await getStorefrontInquiryForQuoteCheckout({
    quoteNumber: input.quoteNumber,
    userId: input.userId,
  });

  if (!inquiry) {
    return { ok: false as const, code: 'QUOTE_NOT_AVAILABLE' as const, message: 'Quote is not available for checkout.' };
  }

  const commerceConfig = await getCommerceConfig();
  const productIds = inquiry.quotedLines.map((line) => line.productId);
  const productRows = await db
    .select({
      id: products.id,
      purchaseMode: products.purchaseMode,
      productName: productNameSql(products.id, locale),
      slug: productSlugSql(products.id, locale),
      spu: products.spu,
      shortDescription: productShortDescriptionSql(products.id, locale),
      stockQuantity: productStockQuantitySql(products.id, locale),
      currencyCode: productCurrencyCodeSql(products.id, locale),
      basePrice: productPriceSql(products.id, locale),
      compareAtPrice: productCompareAtPriceSql(products.id, locale),
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const productById = new Map(productRows.map((row) => [row.id, row]));
  const imageRows = await db
    .select({
      productId: productImages.productId,
      id: productImages.id,
      url: productImages.url,
      alt: productImages.alt,
      width: productImages.width,
      height: productImages.height,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder));

  const imageByProductId = new Map<string, (typeof imageRows)[number]>();
  for (const row of imageRows) {
    if (!imageByProductId.has(row.productId)) {
      imageByProductId.set(row.productId, row);
    }
  }

  const translationsByProductId = await loadProductTranslationsByProductIds(productIds);
  let subtotal = 0;
  let listSubtotal = 0;
  const currencyCode = inquiry.quotedLines[0]?.currency ?? 'USD';
  const couponLines: CartLineForCoupon[] = [];
  const items: NonNullable<Awaited<ReturnType<typeof getCartDetail>>>['items'] = [];

  for (const quotedLine of inquiry.quotedLines) {
    const product = productById.get(quotedLine.productId);
    if (!product) {
      return { ok: false as const, code: 'PRODUCT_NOT_FOUND' as const, message: 'Quoted product is no longer available.' };
    }

    const quantity = quotedLine.quantity;
    const unitPriceAmount = quotedLine.unitPrice;
    const lineSubtotal = Number((unitPriceAmount * quantity).toFixed(2));
    const basePriceAmount = Number(product.basePrice);
    subtotal += lineSubtotal;
    listSubtotal += basePriceAmount * quantity;
    couponLines.push({ productId: quotedLine.productId, lineSubtotal, unitPrice: unitPriceAmount, quantity });

    const translation = pickProductTranslation(translationsByProductId.get(quotedLine.productId), locale);
    const imageRow = imageByProductId.get(quotedLine.productId);
    const coverImage = resolveProductCoverImage(
      quotedLine.productId,
      quotedLine.name || product.productName,
      imageRow ? { id: imageRow.id, url: imageRow.url, alt: imageRow.alt, width: imageRow.width, height: imageRow.height } : undefined,
      translation?.payload,
    );

    items.push({
      id: `quote-${quotedLine.productId}`,
      productId: quotedLine.productId,
      product: {
        id: quotedLine.productId,
        name: quotedLine.name || product.productName,
        slug: quotedLine.slug || product.slug,
        spu: quotedLine.spu || product.spu,
        shortDescription: product.shortDescription,
        price: formatMoney(product.basePrice, currencyCode),
        compareAtPrice: product.compareAtPrice ? formatMoney(product.compareAtPrice, currencyCode) : null,
        purchaseMode: product.purchaseMode,
        inStock: product.stockQuantity > 0,
        brand: null,
        coverImage,
      },
      quantity,
      listUnitPrice: formatMoney(product.basePrice, currencyCode),
      unitPrice: formatMoney(unitPriceAmount, currencyCode),
      subtotal: formatMoney(lineSubtotal, currencyCode),
      tierApplied: unitPriceAmount < basePriceAmount,
      configurationKey: '',
      featureSelections: [],
      configurationLabel: quotedLine.leadTime ? `Lead time: ${quotedLine.leadTime}` : '',
      variantLabel: quotedLine.note || '',
    });
  }

  const summary = await buildCartPricingSummary({
    subtotal,
    listSubtotal,
    couponCode: null,
    currencyCode,
    locale,
    lines: couponLines,
    commerceConfig,
    defaultCountryCode: (await getSiteSettings()).defaultCountryCode,
    pricingContext: await resolveCommercePricingContext(currencyCode),
  });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ok: true as const,
    detail: {
      id: `quote-${inquiry.quoteNumber}`,
      locale,
      quoteNumber: inquiry.quoteNumber,
      inquiryId: inquiry.id,
      items,
      itemCount,
      couponCode: null,
      coupon: toPublicCouponSummary(summary.coupon),
      subtotal: formatMoney(subtotal, currencyCode),
      volumeDiscount: formatMoney(summary.volumeDiscount, currencyCode),
      discount: formatMoney(summary.discount, currencyCode),
      shipping: formatMoney(summary.shippingAmount, currencyCode),
      tax: formatMoney(summary.taxAmount, currencyCode),
      total: formatMoney(summary.totalAmount, currencyCode),
      freeShippingThreshold: formatMoney(summary.freeShippingThreshold, currencyCode),
      remainingForFreeShipping: formatMoney(summary.remainingForFreeShipping, currencyCode),
      readOnlyQuantities: true,
    },
  };
}

export async function createOrderFromQuoteLines(input: {
  userId: string;
  quoteNumber: string;
  shippingAddressId: string;
  billingAddressId: string;
  shippingMethod: string;
  paymentMethod: string;
  customerNote?: string;
  locale?: string | null;
}) {
  const preview = await buildQuoteCartPreview({
    quoteNumber: input.quoteNumber,
    userId: input.userId,
    locale: input.locale,
  });

  if (!preview.ok) {
    return null;
  }

  const [ship, bill] = await Promise.all([
    db.select().from(addresses).where(eq(addresses.id, input.shippingAddressId)).limit(1),
    db.select().from(addresses).where(eq(addresses.id, input.billingAddressId)).limit(1),
  ]);

  const shippingRow = ship[0];
  const billingRow = bill[0];
  if (!shippingRow || !billingRow || shippingRow.userId !== input.userId || billingRow.userId !== input.userId) {
    return null;
  }

  const commerceConfig = await getCommerceConfig();
  const pricingContext = await resolveCommercePricingContext(preview.detail.subtotal.currency);
  const pricing = calculateOrderPricing(commerceConfig, {
    subtotal: preview.detail.subtotal.amount,
    discountAmount: preview.detail.discount.amount,
    countryCode: String(shippingRow.countryCode),
    shippingMethodCode: input.shippingMethod,
    pricingContext,
  });

  if (!pricing.selectedShippingOption) {
    return null;
  }

  const composedNote = [
    `Quote checkout: ${input.quoteNumber}`,
    `Source: quote`,
    input.customerNote?.trim() || null,
  ].filter(Boolean).join('\n');

  return insertOrderFromCartDetail({
    userId: input.userId,
    cartId: null,
    shippingAddressId: input.shippingAddressId,
    billingAddressId: input.billingAddressId,
    shippingSnapshot: toOrderAddressSnapshot(shippingRow),
    billingSnapshot: toOrderAddressSnapshot(billingRow),
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    customerNote: composedNote,
    locale: input.locale,
    currencyCode: preview.detail.subtotal.currency,
    detail: preview.detail,
    pricing,
  });
}
