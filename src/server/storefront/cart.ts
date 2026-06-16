import { randomUUID } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';

import { calculateOrderPricing } from '@/lib/commerce-config';
import { db } from '@/server/db';
import { addresses, cartItems, carts, orderItems, orders, productImages, products } from '@/server/db/schema';
import { getVolumePricingForQuantity } from '@/lib/volume-pricing';
import { getCommerceConfig } from '@/server/commerce/config';

import { getSeedProductById } from './seed';

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

type MemoryCartItem = {
  id: string;
  productId: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  subtotal: number;
};

type MemoryCart = {
  id: string;
  userId: string | null;
  anonymousToken: string | null;
  status: 'active' | 'converted';
  currencyCode: string;
  couponCode: string | null;
  items: MemoryCartItem[];
  createdAt: Date;
  updatedAt: Date;
};

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

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';

type MemoryOrderItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  createdAt: Date;
};

type MemoryOrder = {
  id: string;
  orderNumber: string;
  guestAccessToken: string | null;
  userId: string | null;
  cartId: string;
  status: OrderStatus;
  currencyCode: string;
  subtotal: string;
  shippingAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  shippingMethod: string;
  paymentMethod: string;
  customerNote: string | null;
  shippingAddressSnapshot: OrderAddressSnapshot;
  billingAddressSnapshot: OrderAddressSnapshot;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: MemoryOrderItem[];
};

declare global {
  var __vexmotorMemoryCartStore__:
    | {
        cartsByOwner: Map<string, MemoryCart>;
        cartsById: Map<string, MemoryCart>;
      }
    | undefined;
  var __vexmotorMemoryOrderStore__:
    | {
        ordersByNumber: Map<string, MemoryOrder>;
      }
    | undefined;
}

function getMemoryCartStore() {
  if (!globalThis.__vexmotorMemoryCartStore__) {
    globalThis.__vexmotorMemoryCartStore__ = {
      cartsByOwner: new Map(),
      cartsById: new Map(),
    };
  }

  return globalThis.__vexmotorMemoryCartStore__;
}

function getMemoryOrderStore() {
  if (!globalThis.__vexmotorMemoryOrderStore__) {
    globalThis.__vexmotorMemoryOrderStore__ = {
      ordersByNumber: new Map(),
    };
  }

  return globalThis.__vexmotorMemoryOrderStore__;
}

function getMemoryCartOwnerKey(input: { userId?: string | null; anonymousToken?: string | null }) {
  return input.userId ? `user:${input.userId}` : `guest:${input.anonymousToken ?? 'anonymous'}`;
}

function getOrCreateMemoryCart(input: { userId?: string | null; anonymousToken?: string | null }) {
  const store = getMemoryCartStore();
  const ownerKey = getMemoryCartOwnerKey(input);
  const existing = store.cartsByOwner.get(ownerKey);

  if (existing && existing.status === 'active') {
    return existing;
  }

  const nextCart: MemoryCart = {
    id: randomUUID(),
    userId: input.userId ?? null,
    anonymousToken: input.userId ? null : input.anonymousToken ?? null,
    status: 'active',
    currencyCode: 'USD',
    couponCode: null,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.cartsByOwner.set(ownerKey, nextCart);
  store.cartsById.set(nextCart.id, nextCart);
  return nextCart;
}

function getMemoryCartById(cartId: string) {
  return getMemoryCartStore().cartsById.get(cartId) ?? null;
}

function findExistingMemoryCart(input: { userId?: string | null; anonymousToken?: string | null }) {
  if (!input.userId && !input.anonymousToken) {
    return null;
  }

  const ownerKey = getMemoryCartOwnerKey(input);
  const existing = getMemoryCartStore().cartsByOwner.get(ownerKey);
  return existing && existing.status === 'active' ? existing : null;
}

function getMemoryOrderByNumber(orderNumber: string) {
  return getMemoryOrderStore().ordersByNumber.get(orderNumber) ?? null;
}

function mapMemoryAdminOrderSummary(order: MemoryOrder) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    customerEmail: null,
    customerName: order.shippingAddressSnapshot.firstName,
    customerLastName: order.shippingAddressSnapshot.lastName,
  };
}

function mapMemoryAdminOrderDetail(order: MemoryOrder) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    customerNote: order.customerNote,
    shippingAddressSnapshot: order.shippingAddressSnapshot,
    billingAddressSnapshot: order.billingAddressSnapshot,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    customerEmail: null,
    customerName: order.shippingAddressSnapshot.firstName,
    customerLastName: order.shippingAddressSnapshot.lastName,
    items: order.items,
  };
}

export function getMemoryAdminOrders() {
  return Array.from(getMemoryOrderStore().ordersByNumber.values())
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map(mapMemoryAdminOrderSummary);
}

export function getMemoryAdminOrderDetail(orderNumber: string) {
  const order = getMemoryOrderByNumber(orderNumber);
  return order ? mapMemoryAdminOrderDetail(order) : null;
}

export function updateMemoryAdminOrder(input: { orderNumber: string; status?: OrderStatus }) {
  const order = getMemoryOrderByNumber(input.orderNumber);
  if (!order) {
    return null;
  }

  if (typeof input.status !== 'undefined') {
    order.status = input.status;
    order.updatedAt = new Date();
  }

  return mapMemoryAdminOrderDetail(order);
}

function createOrderNumber() {
  return `VM-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`;
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

function buildMemoryCartDetail(cart: MemoryCart, awaitedCommerceConfig: Awaited<ReturnType<typeof getCommerceConfig>>) {
  const items = cart.items
    .map((item) => {
      const product = getSeedProductById(item.productId);
      if (!product) {
        return null;
      }

      return {
        id: item.id,
        productId: item.productId,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          shortDescription: product.shortDescription,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          purchaseMode: product.purchaseMode,
          inStock: product.inStock,
          brand: product.brand,
          coverImage: product.coverImage,
        },
        quantity: item.quantity,
        listUnitPrice: formatMoney(item.basePrice, cart.currencyCode),
        unitPrice: formatMoney(item.unitPrice, cart.currencyCode),
        subtotal: formatMoney(item.subtotal, cart.currencyCode),
        tierApplied: item.unitPrice < item.basePrice,
        variantLabel: '',
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const subtotal = items.reduce((sum, item) => sum + item.subtotal.amount, 0);
  const listSubtotal = cart.items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  const summary = buildCartPricingSummary({
    subtotal,
    listSubtotal,
    couponCode: cart.couponCode,
    currencyCode: cart.currencyCode,
    commerceConfig: awaitedCommerceConfig,
  });

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
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

async function updateMemoryCartCoupon(cartId: string, couponCode?: string | null) {
  const cart = getMemoryCartById(cartId);
  if (!cart) {
    return { detail: null, error: 'CART_NOT_FOUND', message: 'Cart could not be found.' };
  }

  const commerceConfig = await getCommerceConfig();

  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (!normalizedCouponCode) {
    cart.couponCode = null;
    cart.updatedAt = new Date();
    return { detail: buildMemoryCartDetail(cart, commerceConfig), error: null, message: null };
  }

  const coupon = CART_COUPONS[normalizedCouponCode as keyof typeof CART_COUPONS];
  if (!coupon) {
    return { detail: null, error: 'INVALID_COUPON', message: 'Coupon code is not recognized.' };
  }

  const detail = buildMemoryCartDetail(cart, commerceConfig);
  if (!detail.items.length) {
    return { detail: null, error: 'EMPTY_CART', message: 'Add at least one item before applying a coupon.' };
  }

  if (detail.subtotal.amount < coupon.minimumSubtotal) {
    return {
      detail: null,
      error: 'COUPON_INELIGIBLE',
      message: `${coupon.code} requires a merchandise subtotal of ${formatMoney(coupon.minimumSubtotal, cart.currencyCode).formatted}.`,
    };
  }

  cart.couponCode = coupon.code;
  cart.updatedAt = new Date();
  return { detail: buildMemoryCartDetail(cart, commerceConfig), error: null, message: null };
}

async function addMemoryCartItem(input: { cartId: string; productId: string; quantity: number }) {
  const cart = getMemoryCartById(input.cartId);
  const product = getSeedProductById(input.productId);
  if (!cart || !product || product.purchaseMode !== 'buy') {
    return null;
  }

  const commerceConfig = await getCommerceConfig();

  const existing = cart.items.find((item) => item.productId === input.productId);
  const basePrice = product.price.amount;
  if (existing) {
    existing.quantity += input.quantity;
    existing.basePrice = basePrice;
    existing.unitPrice = resolveTierUnitPrice(basePrice, cart.currencyCode, existing.quantity, commerceConfig.volumePricingRules);
    existing.subtotal = existing.quantity * existing.unitPrice;
  } else {
    const quantity = input.quantity;
    const unitPrice = resolveTierUnitPrice(basePrice, cart.currencyCode, quantity, commerceConfig.volumePricingRules);
    cart.items.push({
      id: randomUUID(),
      productId: input.productId,
      quantity,
      basePrice,
      unitPrice,
      subtotal: quantity * unitPrice,
    });
  }

  cart.updatedAt = new Date();
  return buildMemoryCartDetail(cart, commerceConfig);
}

async function updateMemoryCartItemQuantity(itemId: string, quantity: number) {
  const cart = Array.from(getMemoryCartStore().cartsById.values()).find((candidate) => candidate.items.some((item) => item.id === itemId));
  const lineItem = cart?.items.find((item) => item.id === itemId);
  if (!cart || !lineItem) {
    return null;
  }

  const commerceConfig = await getCommerceConfig();

  lineItem.quantity = quantity;
  lineItem.unitPrice = resolveTierUnitPrice(lineItem.basePrice, cart.currencyCode, quantity, commerceConfig.volumePricingRules);
  lineItem.subtotal = lineItem.unitPrice * quantity;
  cart.updatedAt = new Date();
  return buildMemoryCartDetail(cart, commerceConfig);
}

async function deleteMemoryCartItem(itemId: string) {
  const cart = Array.from(getMemoryCartStore().cartsById.values()).find((candidate) => candidate.items.some((item) => item.id === itemId));
  if (!cart) {
    return null;
  }

  const commerceConfig = await getCommerceConfig();

  cart.items = cart.items.filter((item) => item.id !== itemId);
  cart.updatedAt = new Date();
  return buildMemoryCartDetail(cart, commerceConfig);
}

async function createMemoryOrderFromCart(input: {
  userId?: string | null;
  cartId: string;
  shippingMethod: string;
  paymentMethod: string;
  customerNote?: string;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot;
}) {
  const memoryCart = getMemoryCartById(input.cartId);
  if (!memoryCart) {
    return null;
  }

  if (input.userId && memoryCart.userId && memoryCart.userId !== input.userId) {
    return null;
  }

  const detail = await getCartDetail(input.cartId);
  if (!detail || !detail.items.length) {
    return null;
  }

  const commerceConfig = await getCommerceConfig();
  const pricing = calculateOrderPricing(commerceConfig, {
    subtotal: detail.subtotal.amount,
    discountAmount: detail.discount.amount,
    countryCode: input.shippingAddress.countryCode,
    shippingMethodCode: input.shippingMethod,
  });
  if (!pricing.selectedShippingOption) {
    return null;
  }

  const now = new Date();
  const orderNumber = createOrderNumber();
  const order: MemoryOrder = {
    id: randomUUID(),
    orderNumber,
    guestAccessToken: input.userId ? null : randomUUID(),
    userId: input.userId ?? null,
    cartId: input.cartId,
    status: 'pending',
    currencyCode: detail.total.currency,
    subtotal: detail.subtotal.amount.toFixed(2),
    shippingAmount: pricing.shippingAmount.toFixed(2),
    taxAmount: pricing.taxAmount.toFixed(2),
    discountAmount: detail.discount.amount.toFixed(2),
    totalAmount: pricing.totalAmount.toFixed(2),
    shippingMethod: pricing.selectedShippingOption.title,
    paymentMethod: input.paymentMethod,
    customerNote: [detail.coupon?.isApplied ? `Coupon: ${detail.coupon.code}` : null, input.customerNote?.trim() || null].filter(Boolean).join('\n') || null,
    shippingAddressSnapshot: input.shippingAddress,
    billingAddressSnapshot: input.billingAddress,
    placedAt: now,
    createdAt: now,
    updatedAt: now,
    items: detail.items.map((item) => ({
      id: randomUUID(),
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice.amount.toFixed(2),
      subtotal: item.subtotal.amount.toFixed(2),
      createdAt: now,
    })),
  };

  getMemoryOrderStore().ordersByNumber.set(orderNumber, order);
  memoryCart.status = 'converted';
  memoryCart.updatedAt = now;

  return order;
}

export async function getGuestOrderDetailByNumber(orderNumber: string, guestAccessToken?: string | null) {
  const memoryOrder = getMemoryOrderByNumber(orderNumber);
  if (!memoryOrder || !memoryOrder.guestAccessToken || memoryOrder.guestAccessToken !== guestAccessToken) {
    return null;
  }

  return memoryOrder;
}

export async function getOrCreateCart(input: { userId?: string | null; anonymousToken?: string | null }) {
  if (!db) {
    return getOrCreateMemoryCart(input);
  }

  try {
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
  } catch {
    return getOrCreateMemoryCart(input);
  }
}

export async function getExistingActiveCartDetail(input: { userId?: string | null; anonymousToken?: string | null }) {
  const commerceConfig = await getCommerceConfig();

  if (!db) {
    const existing = findExistingMemoryCart(input);
    return existing ? buildMemoryCartDetail(existing, commerceConfig) : null;
  }

  if (!input.userId && !input.anonymousToken) {
    return null;
  }

  try {
    const [existing] = input.userId
      ? await db.select().from(carts).where(and(eq(carts.userId, input.userId), eq(carts.status, 'active'))).limit(1)
      : await db.select().from(carts).where(and(eq(carts.anonymousToken, input.anonymousToken ?? ''), eq(carts.status, 'active'))).limit(1);

    return existing ? getCartDetail(existing.id) : null;
  } catch {
    const existing = findExistingMemoryCart(input);
    return existing ? buildMemoryCartDetail(existing, commerceConfig) : null;
  }
}

export async function getActiveCartDetail(input: { userId?: string | null; anonymousToken?: string | null }) {
  const cart = await getOrCreateCart(input);
  if (!cart) {
    return null;
  }

  return getCartDetail(cart.id);
}

export async function getCartDetail(cartId: string) {
  const commerceConfig = await getCommerceConfig();

  if (!db) return getMemoryCartById(cartId) ? buildMemoryCartDetail(getMemoryCartById(cartId)!, commerceConfig) : null;

  try {
    const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
    if (!cart) return null;

    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        subtotal: cartItems.subtotal,
        productName: products.name,
        slug: products.slug,
        sku: products.sku,
        shortDescription: products.shortDescription,
        purchaseMode: products.purchaseMode,
        stockQuantity: products.stockQuantity,
        currencyCode: products.currencyCode,
        basePrice: products.price,
        compareAtPrice: products.compareAtPrice,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(cartItems.cartId, cartId));

    const imageRows = items.length
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
          .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, items.map((item) => item.productId))))
      : [];

    const firstImageByProductId = new Map(
      imageRows.map((row) => [
        row.productId,
        {
          id: row.id,
          url: row.url,
          alt: row.alt,
          width: row.width,
          height: row.height,
        },
      ]),
    );

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const listSubtotal = items.reduce((sum, item) => sum + Number(item.basePrice) * item.quantity, 0);
    const summary = buildCartPricingSummary({
      subtotal,
      listSubtotal,
      couponCode: cart.couponCode,
      currencyCode: cart.currencyCode,
      commerceConfig,
    });

    return {
      id: cart.id,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.productId,
          name: item.productName,
          slug: item.slug,
          sku: item.sku,
          shortDescription: item.shortDescription,
          price: formatMoney(item.basePrice, item.currencyCode),
          compareAtPrice: item.compareAtPrice ? formatMoney(item.compareAtPrice, item.currencyCode) : null,
          purchaseMode: item.purchaseMode,
          inStock: item.stockQuantity > 0,
          brand: null,
          coverImage: firstImageByProductId.get(item.productId) ?? null,
        },
        quantity: item.quantity,
        listUnitPrice: formatMoney(item.basePrice, item.currencyCode),
        unitPrice: formatMoney(item.unitPrice, item.currencyCode),
        subtotal: formatMoney(item.subtotal, item.currencyCode),
        tierApplied: Number(item.unitPrice) < Number(item.basePrice),
        variantLabel: '',
      })),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
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
  } catch {
    const memoryCart = getMemoryCartById(cartId);
    return memoryCart ? buildMemoryCartDetail(memoryCart, commerceConfig) : null;
  }
}

export async function updateCartCoupon(cartId: string, couponCode?: string | null) {
  if (!db) {
    return updateMemoryCartCoupon(cartId, couponCode);
  }

  try {
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
  } catch {
    return updateMemoryCartCoupon(cartId, couponCode);
  }
}

export async function addCartItem(input: { cartId: string; productId: string; quantity: number }) {
  if (!db) return addMemoryCartItem(input);

  try {
    const commerceConfig = await getCommerceConfig();
    const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product || product.purchaseMode !== 'buy') {
      return null;
    }

    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, input.cartId), eq(cartItems.productId, input.productId)))
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
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing.id));
    } else {
      const unitPrice = resolveTierUnitPrice(unitPriceBase, product.currencyCode ?? 'USD', input.quantity, commerceConfig.volumePricingRules);
      await db.insert(cartItems).values({
        cartId: input.cartId,
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: (input.quantity * unitPrice).toFixed(2),
      });
    }

    return getCartDetail(input.cartId);
  } catch {
    return addMemoryCartItem(input);
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  if (!db) return updateMemoryCartItemQuantity(itemId, quantity);

  try {
    const commerceConfig = await getCommerceConfig();
    const [existing] = await db.select().from(cartItems).where(eq(cartItems.id, itemId)).limit(1);
    if (!existing) {
      return null;
    }

    const [product] = await db.select().from(products).where(eq(products.id, existing.productId)).limit(1);
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
  } catch {
    return updateMemoryCartItemQuantity(itemId, quantity);
  }
}

export async function deleteCartItem(itemId: string) {
  if (!db) return deleteMemoryCartItem(itemId);

  try {
    const [deleted] = await db.delete(cartItems).where(eq(cartItems.id, itemId)).returning();
    if (!deleted) {
      return null;
    }

    return getCartDetail(deleted.cartId);
  } catch {
    return deleteMemoryCartItem(itemId);
  }
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
}) {
  if (!input.userId) {
    if (!input.shippingAddress || !input.billingAddress) {
      return null;
    }

    return createMemoryOrderFromCart({
      userId: null,
      cartId: input.cartId,
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      customerNote: input.customerNote,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
    });
  }

  if (!db) return null;

  try {
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

    const detail = await getCartDetail(input.cartId);
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
        status: 'pending',
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
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount.toFixed(2),
        subtotal: item.subtotal.amount.toFixed(2),
      })),
    );

    await db.update(carts).set({ status: 'converted', updatedAt: new Date() }).where(eq(carts.id, input.cartId));

    return createdOrder;
  } catch {
    return null;
  }
}
