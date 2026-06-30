import { randomUUID } from 'node:crypto';

import { and, asc, eq, gt, inArray } from 'drizzle-orm';

import { calculateOrderPricing } from '@/lib/commerce-config';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import { buildConfigurationLabel, type FeatureSelectionSnapshot } from '@/lib/product-feature-selection';
import { getVolumePricingForQuantity } from '@/lib/volume-pricing';
import { validateAndBuildFeatureSelections } from '@/server/admin/product-features';
import { getCommerceConfig } from '@/server/commerce/config';
import { db } from '@/server/db';
import {
  loadProductTranslationsByProductIds,
  pickProductTranslation,
  resolveProductCoverImage,
} from '@/server/products/load-product-translations';
import { productCompareAtPriceSql, productCurrencyCodeSql, productNameSql, productPriceSql, productShortDescriptionSql, productSlugSql, productStockQuantitySql } from '@/server/products/resolve-product-translation';
import { addresses, cartItems, carts, orderCouponRedemptions, orderItems, orders, productImages, products, verificationTokens } from '@/server/db/schema';

function cartLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

function formatMoney(amount: string | number, currencyCode = 'USD') {
  const numeric = Number(amount);
  return {
    currency: currencyCode,
    amount: numeric,
    formatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(numeric),
  };
}

function resolveTierUnitPrice(basePrice: number, currencyCode: string, quantity: number, volumePricingRules?: Parameters<typeof getVolumePricingForQuantity>[3]) {
  return getVolumePricingForQuantity(basePrice, currencyCode, quantity, volumePricingRules).unitPriceAmount;
}

const CART_COUPONS = {
  SMALLBATCH5: {
    code: 'SMALLBATCH5',
    description: '5% off direct-buy orders above $120.',
    minimumSubtotal: 120,
    discountRate: 0.05,
  },
  B2B10: {
    code: 'B2B10',
    description: '10% off catalog orders above $400.',
    minimumSubtotal: 400,
    discountRate: 0.1,
  },
} as const;

function normalizeCouponCode(couponCode?: string | null) {
  return couponCode?.trim().toUpperCase() || null;
}

function getCouponSummary(couponCode: string | null | undefined, subtotal: number) {
  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (!normalizedCouponCode) {
    return null;
  }

  const coupon = CART_COUPONS[normalizedCouponCode as keyof typeof CART_COUPONS];
  if (!coupon) {
    return null;
  }

  const isApplied = subtotal >= coupon.minimumSubtotal;
  return {
    code: coupon.code,
    description: coupon.description,
    isApplied,
    message: isApplied ? null : `Requires a merchandise subtotal of ${formatMoney(coupon.minimumSubtotal).formatted}.`,
    discountAmount: isApplied ? subtotal * coupon.discountRate : 0,
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

function buildCartPricingSummary(input: {
  subtotal: number;
  listSubtotal: number;
  couponCode: string | null;
  currencyCode: string;
  commerceConfig: Awaited<ReturnType<typeof getCommerceConfig>>;
}) {
  const volumeDiscount = Math.max(input.listSubtotal - input.subtotal, 0);
  const coupon = getCouponSummary(input.couponCode, input.subtotal);
  const discount = coupon?.discountAmount ?? 0;
  const pricing = calculateOrderPricing(input.commerceConfig, {
    subtotal: input.subtotal,
    discountAmount: discount,
    countryCode: input.commerceConfig.defaultCountryCode,
    shippingMethodCode: input.commerceConfig.defaultShippingMethodCode,
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

  const subtotal = pricedItems.reduce((sum, row) => sum + row.lineSubtotal, 0);
  const listSubtotal = pricedItems.reduce((sum, row) => sum + row.basePriceAmount * row.item.quantity, 0);
  const summary = buildCartPricingSummary({
    subtotal,
    listSubtotal,
    couponCode: cart.couponCode,
    currencyCode: cart.currencyCode,
    commerceConfig,
  });

  return {
    id: cart.id,
    locale,
    items: pricedItems.map(({ item, basePriceAmount, unitPriceAmount, lineSubtotal }) => {
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
          price: formatMoney(item.basePrice, item.currencyCode),
          compareAtPrice: item.compareAtPrice ? formatMoney(item.compareAtPrice, item.currencyCode) : null,
          purchaseMode: item.purchaseMode,
          inStock: item.stockQuantity > 0,
          brand: null,
          coverImage,
        },
        quantity: item.quantity,
        listUnitPrice: formatMoney(item.basePrice, item.currencyCode),
        unitPrice: formatMoney(unitPriceAmount, item.currencyCode),
        subtotal: formatMoney(lineSubtotal, item.currencyCode),
        tierApplied: unitPriceAmount < basePriceAmount,
        configurationKey: item.configurationKey,
        featureSelections,
        configurationLabel,
        variantLabel: configurationLabel,
      };
    }),
    itemCount: pricedItems.reduce((sum, row) => sum + row.item.quantity, 0),
    couponCode: cart.couponCode,
    coupon: summary.coupon,
    subtotal: formatMoney(subtotal, cart.currencyCode),
    volumeDiscount: formatMoney(summary.volumeDiscount, cart.currencyCode),
    discount: formatMoney(summary.discount, cart.currencyCode),
    shipping: formatMoney(summary.shippingAmount, cart.currencyCode),
    tax: formatMoney(summary.taxAmount, cart.currencyCode),
    total: formatMoney(summary.totalAmount, cart.currencyCode),
    freeShippingThreshold: formatMoney(summary.freeShippingThreshold, cart.currencyCode),
    remainingForFreeShipping: formatMoney(summary.remainingForFreeShipping, cart.currencyCode),
  };
}

export async function updateCartCoupon(cartId: string, couponCode?: string | null) {
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) {
    return { detail: null, error: 'CART_NOT_FOUND', message: 'Cart could not be found.' };
  }

  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (!normalizedCouponCode) {
    await db.update(carts).set({ couponCode: null, updatedAt: new Date() }).where(eq(carts.id, cartId));
    return { detail: await getCartDetail(cartId), error: null, message: null };
  }

  const coupon = CART_COUPONS[normalizedCouponCode as keyof typeof CART_COUPONS];
  if (!coupon) {
    return { detail: null, error: 'INVALID_COUPON', message: 'Coupon code is not recognized.' };
  }

  const currentDetail = await getCartDetail(cartId);
  if (!currentDetail || !currentDetail.items.length) {
    return { detail: null, error: 'EMPTY_CART', message: 'Add at least one item before applying a coupon.' };
  }

  if (currentDetail.subtotal.amount < coupon.minimumSubtotal) {
    return {
      detail: null,
      error: 'COUPON_INELIGIBLE',
      message: `${coupon.code} requires a merchandise subtotal of ${formatMoney(coupon.minimumSubtotal, cart.currencyCode).formatted}.`,
    };
  }

  await db.update(carts).set({ couponCode: coupon.code, updatedAt: new Date() }).where(eq(carts.id, cartId));
  return { detail: await getCartDetail(cartId), error: null, message: null };
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
  if (!input.userId) {
    return null;
  }

  const commerceConfig = await getCommerceConfig();
  if (!input.shippingAddressId || !input.billingAddressId) {
    return null;
  }

  const [shippingAddress, billingAddress, cart] = await Promise.all([
    db.select().from(addresses).where(eq(addresses.id, input.shippingAddressId)).limit(1),
    db.select().from(addresses).where(eq(addresses.id, input.billingAddressId)).limit(1),
    db.select().from(carts).where(eq(carts.id, input.cartId)).limit(1),
  ]);

  const ship = shippingAddress[0];
  const bill = billingAddress[0];
  const currentCart = cart[0];
  if (!ship || !bill || !currentCart || currentCart.userId !== input.userId) {
    return null;
  }
  if (ship.userId !== input.userId || bill.userId !== input.userId) {
    return null;
  }
  if (ship.addressType !== 'shipping' || bill.addressType !== 'billing') {
    return null;
  }

  const detail = await getCartDetail(input.cartId, input.locale);
  if (!detail || !detail.items.length) {
    return null;
  }

  const pricing = calculateOrderPricing(commerceConfig, {
    subtotal: detail.subtotal.amount,
    discountAmount: detail.discount.amount,
    countryCode: String(ship.countryCode),
    shippingMethodCode: input.shippingMethod,
  });
  if (!pricing.selectedShippingOption) {
    return null;
  }

  const orderNumber = createOrderNumber();
  const composedCustomerNote = [detail.coupon?.isApplied ? `Coupon: ${detail.coupon.code}` : null, input.customerNote?.trim() || null].filter(Boolean).join('\n');
  const [createdOrder] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: input.userId,
      cartId: input.cartId,
      status: 'unpaid',
      paymentStatus: 'unpaid',
      locale: normalizeLocale(input.locale),
      currencyCode: currentCart.currencyCode,
      subtotal: detail.subtotal.amount.toFixed(2),
      shippingAmount: pricing.shippingAmount.toFixed(2),
      taxAmount: pricing.taxAmount.toFixed(2),
      discountAmount: detail.discount.amount.toFixed(2),
      totalAmount: pricing.totalAmount.toFixed(2),
      shippingMethod: pricing.selectedShippingOption.title,
      paymentMethod: input.paymentMethod,
      customerNote: composedCustomerNote || null,
      shippingAddressSnapshot: ship,
      billingAddressSnapshot: bill,
      placedAt: new Date(),
    })
    .returning();

  if (!createdOrder) {
    return null;
  }

  await db.insert(orderItems).values(
    detail.items.map((item) => ({
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

  if (detail.coupon?.isApplied && detail.coupon.code in CART_COUPONS) {
    const coupon = CART_COUPONS[detail.coupon.code as keyof typeof CART_COUPONS];
    await db.insert(orderCouponRedemptions).values({
      orderId: createdOrder.id,
      couponCode: detail.coupon.code,
      couponName: detail.coupon.code,
      discountType: 'percent',
      discountValue: String(coupon.discountRate),
      discountAmount: detail.discount.amount.toFixed(2),
      scopeSummary: '全场',
    });
  }

  await db.update(carts).set({ status: 'converted', updatedAt: new Date() }).where(eq(carts.id, input.cartId));
  return createdOrder;
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
  return { ...order, items };
}
