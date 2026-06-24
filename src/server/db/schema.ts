import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { ShippingCountryRateConfig, ShippingMethodConfig, VolumePricingRuleConfig } from '@/lib/commerce-config';
import type { EditorialContentPayload } from '@/lib/editorial-content';
import {
  defaultEditorialAutomationConfig,
  type EditorialAiTemplate,
  type EditorialAutomationRule,
  type EditorialCoverageBoard,
  type EditorialBrief,
  type EditorialGenerationRun,
  type EditorialWorkflowSettings,
} from '@/lib/editorial-automation';

export const userRoleEnum = pgEnum('user_role', ['customer', 'staff', 'admin']);
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'super_admin']);
export const adminStatusEnum = pgEnum('admin_status', ['active', 'disabled']);
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled', 'pending']);
export const categoryStatusEnum = pgEnum('category_status', ['active', 'inactive']);
export const brandStatusEnum = pgEnum('brand_status', ['active', 'inactive']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'inactive', 'archived']);
export const purchaseModeEnum = pgEnum('purchase_mode', ['buy', 'inquiry']);
export const simpleStatusEnum = pgEnum('simple_status', ['active', 'inactive']);
export const cartStatusEnum = pgEnum('cart_status', ['active', 'converted', 'abandoned']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded']);
export const inquiryStatusEnum = pgEnum('inquiry_status', ['new', 'contacted', 'quoted', 'closed']);
export const contentStatusEnum = pgEnum('content_status', ['active', 'inactive']);
export const cmsStatusEnum = pgEnum('cms_status', ['draft', 'published', 'archived']);
export const newsletterStatusEnum = pgEnum('newsletter_status', ['subscribed', 'unsubscribed']);
export const accountTypeEnum = pgEnum('account_type', ['oauth', 'oidc', 'email', 'credentials']);
export const editorialContentTypeEnum = pgEnum('editorial_content_type', ['content']);
export const editorialContentModuleEnum = pgEnum('editorial_content_module', ['editorial', 'faq']);
export const productRelationTypeEnum = pgEnum('product_relation_type', ['drivers', 'mechanical-integration', 'power-control', 'custom']);
export const textDirectionEnum = pgEnum('text_direction', ['ltr', 'rtl']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 32 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    company: varchar('company', { length: 150 }),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 32 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    role: adminRoleEnum('role').notNull().default('admin'),
    status: adminStatusEnum('status').notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('admins_email_unique').on(table.email),
  }),
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: accountTypeEnum('type').notNull(),
    provider: varchar('provider', { length: 100 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 191 }).notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerUnique: uniqueIndex('accounts_provider_unique').on(table.provider, table.providerAccountId),
  }),
);

export const siteLanguages = pgTable(
  'site_languages',
  {
    code: varchar('code', { length: 16 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    nativeName: varchar('native_name', { length: 120 }).notNull(),
    region: varchar('region', { length: 80 }).notNull(),
    direction: textDirectionEnum('direction').notNull().default('ltr'),
    countryCodes: jsonb('country_codes').$type<string[]>().notNull().default([]),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    status: simpleStatusEnum('status').notNull().default('active'),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusSortIdx: index('site_languages_status_sort_idx').on(table.status, table.sortOrder),
    defaultIdx: index('site_languages_default_idx').on(table.isDefault),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('sessions_token_unique').on(table.sessionToken),
  }),
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token], name: 'verification_tokens_pk' }),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
    imageUrl: text('image_url'),
    status: categoryStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredOrder: integer('featured_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    featuredIdx: index('categories_featured_idx').on(table.isFeatured, table.featuredOrder),
    parentIdx: index('categories_parent_id_idx').on(table.parentId),
  }),
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    payload: jsonb('payload').$type<{ tags: string[] }>().notNull().default({ tags: [] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryLocaleUnique: uniqueIndex('category_translations_category_locale_unique').on(table.categoryId, table.locale),
    slugLocaleUnique: uniqueIndex('category_translations_slug_locale_unique').on(table.slug, table.locale),
    categoryIdIdx: index('category_translations_category_id_idx').on(table.categoryId),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    logoUrl: text('logo_url'),
    websiteUrl: text('website_url'),
    status: brandStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('brands_status_idx').on(table.status),
  }),
);

export const brandTranslations = pgTable(
  'brand_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    payload: jsonb('payload').$type<{ tags: string[] }>().notNull().default({ tags: [] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandLocaleUnique: uniqueIndex('brand_translations_brand_locale_unique').on(table.brandId, table.locale),
    slugLocaleUnique: uniqueIndex('brand_translations_slug_locale_unique').on(table.slug, table.locale),
    brandIdIdx: index('brand_translations_brand_id_idx').on(table.brandId),
  }),
);

export const productLifecycleEnum = pgEnum('product_lifecycle', ['new', 'active', 'nfd', 'eol', 'last_time_buy']);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    defaultCategoryId: uuid('default_category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    shortDescription: text('short_description'),
    description: text('description'),
    descriptionLong: text('description_long'),
    purchaseMode: purchaseModeEnum('purchase_mode').notNull().default('buy'),
    status: productStatusEnum('status').notNull().default('draft'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    moq: integer('moq').notNull().default(1),
    leadTimeMin: integer('lead_time_min').notNull().default(3),
    leadTimeMax: integer('lead_time_max').notNull().default(15),
    leadTimeUnit: varchar('lead_time_unit', { length: 20 }).notNull().default('business_days'),
    lifecycleStatus: productLifecycleEnum('lifecycle_status').notNull().default('active'),
    eolDate: timestamp('eol_date', { withTimezone: true }),
    lastTimeBuyDate: timestamp('last_time_buy_date', { withTimezone: true }),
    efficiencyClass: varchar('efficiency_class', { length: 20 }),
    certifications: jsonb('certifications').$type<string[]>(),
    configurationRules: jsonb('configuration_rules'),
    torqueCurveData: jsonb('torque_curve_data'),
    paidSampleEnabled: boolean('paid_sample_enabled').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('products_slug_unique').on(table.slug),
    skuUnique: uniqueIndex('products_sku_unique').on(table.sku),
    featuredIdx: index('products_featured_idx').on(table.featured, table.status),
  }),
);

export const commerceSettings = pgTable('commerce_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
  defaultCountryCode: varchar('default_country_code', { length: 16 }).notNull().default('US'),
  defaultShippingMethodCode: varchar('default_shipping_method_code', { length: 100 }).notNull().default('dhl-express'),
  volumePricingRules: jsonb('volume_pricing_rules').$type<VolumePricingRuleConfig[]>().notNull().default([]),
  shippingMethods: jsonb('shipping_methods').$type<ShippingMethodConfig[]>().notNull().default([]),
  shippingCountryRates: jsonb('shipping_country_rates').$type<ShippingCountryRateConfig[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const editorialSettings = pgTable('editorial_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  workflowSettings: jsonb('workflow_settings').$type<EditorialWorkflowSettings>().notNull().default(defaultEditorialAutomationConfig.workflowSettings),
  coverageBoards: jsonb('coverage_boards').$type<EditorialCoverageBoard[]>().notNull().default([]),
  templates: jsonb('templates').$type<EditorialAiTemplate[]>().notNull().default([]),
  rules: jsonb('rules').$type<EditorialAutomationRule[]>().notNull().default([]),
  briefs: jsonb('briefs').$type<EditorialBrief[]>().notNull().default([]),
  runs: jsonb('runs').$type<EditorialGenerationRun[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: varchar('alt', { length: 255 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
  isDimension: boolean('is_dimension').notNull().default(false), // 是否为尺寸图
  imageType: varchar('image_type', { length: 50 }).notNull().default('gallery'), // gallery, dimension, detail
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    attributes: jsonb('attributes').$type<Array<{ group: string; value: string }>>().notNull().default([]),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    status: simpleStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSkuPerProduct: uniqueIndex('product_variants_product_sku_unique').on(table.productId, table.sku),
  }),
);

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    availableQuantity: integer('available_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueInventory: uniqueIndex('inventory_product_variant_unique').on(table.productId, table.variantId),
  }),
);

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productFeatures = pgTable('product_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  featureValue: varchar('feature_value', { length: 255 }).notNull(),
  featureValueMin: numeric('feature_value_min', { precision: 12, scale: 4 }),
  featureValueMax: numeric('feature_value_max', { precision: 12, scale: 4 }),
  valueType: varchar('value_type', { length: 20 }).notNull().default('text'), // text | number | range | boolean | select
  conditionalValue: jsonb('conditional_value'), // { dependsOn: string, condition: string, values: Record<string, string> }
  unit: varchar('unit', { length: 50 }),
  specCategory: varchar('spec_category', { length: 50 }).notNull().default('general'), // electrical, mechanical, performance, environmental, general
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  anonymousToken: varchar('anonymous_token', { length: 255 }),
  status: cartStatusEnum('status').notNull().default('active'),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
  couponCode: varchar('coupon_code', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCartLine: uniqueIndex('cart_items_unique_line').on(table.cartId, table.productId, table.variantId),
  }),
);

export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  company: varchar('company', { length: 150 }),
  phone: varchar('phone', { length: 50 }),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  state: varchar('state', { length: 100 }),
  city: varchar('city', { length: 100 }).notNull(),
  addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 255 }),
  postalCode: varchar('postal_code', { length: 30 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    status: orderStatusEnum('status').notNull().default('pending'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingAmount: numeric('shipping_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingMethod: varchar('shipping_method', { length: 100 }),
    paymentMethod: varchar('payment_method', { length: 100 }),
    customerNote: text('customer_note'),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    placedAt: timestamp('placed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderNumberUnique: uniqueIndex('orders_number_unique').on(table.orderNumber),
  }),
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  variantLabel: varchar('variant_label', { length: 255 }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inquiries = pgTable('inquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 150 }),
  country: varchar('country', { length: 100 }),
  message: text('message').notNull(),
  status: inquiryStatusEnum('status').notNull().default('new'),
  sourcePageUrl: text('source_page_url'),
  handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'set null' }),
  handledAt: timestamp('handled_at', { withTimezone: true }),
  internalNote: text('internal_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueWishlist: uniqueIndex('wishlists_user_product_unique').on(table.userId, table.productId),
  }),
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId], name: 'product_categories_pk' }),
  }),
);

export const productRelations = pgTable(
  'product_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    relatedProductId: uuid('related_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    relationType: productRelationTypeEnum('relation_type').notNull().default('custom'),
    relationLabel: varchar('relation_label', { length: 100 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRelation: uniqueIndex('product_relations_unique').on(table.productId, table.relatedProductId),
    productIdx: index('product_relations_product_idx').on(table.productId, table.sortOrder),
  }),
);

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    summary: text('summary'),
    content: text('content'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('cms_pages_slug_unique').on(table.slug),
  }),
);

export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placement: varchar('placement', { length: 100 }).notNull(),
    blockKey: varchar('block_key', { length: 150 }).notNull(),
    title: varchar('title', { length: 255 }),
    subtitle: varchar('subtitle', { length: 255 }),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    status: contentStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    placementKeyUnique: uniqueIndex('content_blocks_placement_key_unique').on(table.placement, table.blockKey),
  }),
);

export const editorialContents = pgTable(
  'editorial_contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentType: editorialContentTypeEnum('content_type').notNull().default('content'),
    contentModule: editorialContentModuleEnum('content_module').notNull().default('editorial'),
    boardKey: varchar('board_key', { length: 100 }).notNull().default('content'),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeStatusPublishedIdx: index('editorial_contents_type_status_published_idx').on(table.contentType, table.status, table.publishedAt),
    boardKeyIdx: index('editorial_contents_board_key_idx').on(table.boardKey),
    contentModuleBoardIdx: index('editorial_contents_content_module_board_idx').on(table.contentModule, table.boardKey),
  }),
);

export const editorialContentTranslations = pgTable(
  'editorial_content_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentId: uuid('content_id').notNull().references(() => editorialContents.id, { onDelete: 'cascade' }),
    contentType: editorialContentTypeEnum('content_type').notNull().default('content'),
    contentModule: editorialContentModuleEnum('content_module').notNull().default('editorial'),
    locale: varchar('locale', { length: 16 }).notNull().default('en-US'),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    summary: text('summary'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    payload: jsonb('payload').$type<EditorialContentPayload>().notNull().default({
      body: '',
      coverUrl: null,
      coverAlt: null,
      tags: [],
      relatedProductSlugs: [],
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contentLocaleUnique: uniqueIndex('editorial_content_translations_content_locale_unique').on(table.contentId, table.locale),
    moduleSlugLocaleUnique: uniqueIndex('editorial_content_translations_module_slug_locale_unique').on(table.contentModule, table.slug, table.locale),
    contentIdIdx: index('editorial_content_translations_content_id_idx').on(table.contentId),
  }),
);

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    status: newsletterStatusEnum('status').notNull().default('subscribed'),
    source: varchar('source', { length: 100 }),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('newsletter_subscribers_email_unique').on(table.email),
  }),
);

export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    name: varchar('name', { length: 255 }),
    shortDescription: text('short_description'),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productLocaleUnique: uniqueIndex('product_translations_product_locale_unique').on(table.productId, table.locale),
  }),
);
