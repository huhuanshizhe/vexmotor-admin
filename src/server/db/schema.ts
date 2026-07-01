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
import type { VerificationDocument } from '@/lib/customer-profile';
import type { AdminProductPayload } from '@/lib/product-content';
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
export const orderStatusEnum = pgEnum('order_status', ['unpaid', 'pending_processing', 'partially_shipped', 'shipped', 'completed', 'cancelled', 'terminated']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid']);
export const shippingStatusEnum = pgEnum('shipping_status', ['unshipped', 'shipped', 'delivered']);
export const refundStatusEnum = pgEnum('refund_status', ['none', 'pending', 'refunded', 'partially_refunded', 'refund_rejected']);
export const refundTypeEnum = pgEnum('refund_type', ['full_refund', 'partial_refund', 'no_refund']);
export const returnTypeEnum = pgEnum('return_type', ['return_goods', 'no_return']);
export const orderActionTypeEnum = pgEnum('order_action_type', ['status_change', 'shipment_added', 'refund_processed', 'terminated', 'note_updated', 'completed']);
export const inquiryStatusEnum = pgEnum('inquiry_status', ['new', 'contacted', 'quoted', 'closed']);
export const inquiryQueueKindEnum = pgEnum('inquiry_queue_kind', ['new_inquiry', 'customer_replied']);
export const inquirySalesStatusEnum = pgEnum('inquiry_sales_status', ['unset', 'following', 'negotiating', 'won', 'lost']);
export const inquiryMessageSenderTypeEnum = pgEnum('inquiry_message_sender_type', ['customer', 'admin']);
export const contentStatusEnum = pgEnum('content_status', ['active', 'inactive']);
export const cmsStatusEnum = pgEnum('cms_status', ['draft', 'published', 'archived']);
export const newsletterStatusEnum = pgEnum('newsletter_status', ['subscribed', 'unsubscribed']);
export const accountTypeEnum = pgEnum('account_type', ['oauth', 'oidc', 'email', 'credentials']);
export const customerMessageSenderTypeEnum = pgEnum('customer_message_sender_type', ['admin', 'customer']);
export const editorialContentTypeEnum = pgEnum('editorial_content_type', ['content']);
export const editorialContentModuleEnum = pgEnum('editorial_content_module', ['editorial', 'faq']);
export const productRelationTypeEnum = pgEnum('product_relation_type', ['drivers', 'mechanical-integration', 'power-control', 'custom']);
export const textDirectionEnum = pgEnum('text_direction', ['ltr', 'rtl']);
export const geoDivisionLevelEnum = pgEnum('geo_division_level', ['country', 'admin1', 'admin2', 'admin3', 'locality', 'postal']);
export const couponStatusEnum = pgEnum('coupon_status', ['active', 'inactive']);
export const couponScopeEnum = pgEnum('coupon_scope', ['all', 'category', 'brand', 'product']);
export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', ['direct_amount', 'percent', 'fixed_amount', 'special_price']);
export const couponGrantSourceEnum = pgEnum('coupon_grant_source', ['admin_send', 'registration', 'self_claim']);
export const couponDistributionTargetModeEnum = pgEnum('coupon_distribution_target_mode', ['all_customers', 'selected_customers']);

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
    jobTitle: varchar('job_title', { length: 100 }),
    industry: varchar('industry', { length: 80 }),
    companyCountryCode: varchar('company_country_code', { length: 2 }),
    companyState: varchar('company_state', { length: 100 }),
    companyCity: varchar('company_city', { length: 100 }),
    companyAddressLine1: varchar('company_address_line1', { length: 255 }),
    companyAddressLine2: varchar('company_address_line2', { length: 255 }),
    companyPostalCode: varchar('company_postal_code', { length: 30 }),
    website: varchar('website', { length: 255 }),
    taxId: varchar('tax_id', { length: 100 }),
    companySize: varchar('company_size', { length: 50 }),
    annualVolumeEstimate: varchar('annual_volume_estimate', { length: 255 }),
    internalNote: text('internal_note'),
    verificationDocuments: jsonb('verification_documents').$type<VerificationDocument[]>().notNull().default([]),
    role: userRoleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    industryIdx: index('users_industry_idx').on(table.industry),
    companyCountryCodeIdx: index('users_company_country_code_idx').on(table.companyCountryCode),
    statusIdx: index('users_status_idx').on(table.status),
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

export const customerMessages = pgTable('customer_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderType: customerMessageSenderTypeEnum('sender_type').notNull(),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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

export const featureDefinitions = pgTable(
  'feature_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 120 }).notNull(),
    specCategory: varchar('spec_category', { length: 50 }).notNull().default('general'),
    valueType: varchar('value_type', { length: 20 }).notNull().default('text'),
    unit: varchar('unit', { length: 50 }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex('feature_definitions_key_unique').on(table.key),
    statusIdx: index('feature_definitions_status_idx').on(table.status),
  }),
);

export const featureDefinitionTranslations = pgTable(
  'feature_definition_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    definitionId: uuid('definition_id').notNull().references(() => featureDefinitions.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    valueText: varchar('value_text', { length: 255 }),
    valueMin: numeric('value_min', { precision: 12, scale: 4 }),
    valueMax: numeric('value_max', { precision: 12, scale: 4 }),
    unit: varchar('unit', { length: 50 }),
    textOptions: jsonb('text_options').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    definitionLocaleUnique: uniqueIndex('feature_definition_translations_definition_locale_unique').on(table.definitionId, table.locale),
    definitionIdIdx: index('feature_definition_translations_definition_id_idx').on(table.definitionId),
  }),
);

export const productLifecycleEnum = pgEnum('product_lifecycle', ['new', 'active', 'nfd', 'eol', 'last_time_buy']);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    defaultCategoryId: uuid('default_category_id').references(() => categories.id, { onDelete: 'set null' }),
    spu: varchar('spu', { length: 100 }).notNull(),
    purchaseMode: purchaseModeEnum('purchase_mode').notNull().default('buy'),
    status: productStatusEnum('status').notNull().default('inactive'),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    paidSampleEnabled: boolean('paid_sample_enabled').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    featuredSortOrder: integer('featured_sort_order').notNull().default(0),
    hasMultipleSpecs: boolean('has_multiple_specs').notNull().default(false),
    configurationRules: jsonb('configuration_rules'),
    torqueCurveData: jsonb('torque_curve_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    spuUnique: uniqueIndex('products_spu_unique').on(table.spu),
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

export const exchangeRateSettings = pgTable('exchange_rate_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  baseCurrencyCode: varchar('base_currency_code', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exchangeRates = pgTable('exchange_rates', {
  currencyCode: varchar('currency_code', { length: 3 }).primaryKey(),
  rateToBase: numeric('rate_to_base', { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    couponKey: varchar('coupon_key', { length: 64 }).notNull(),
    scope: couponScopeEnum('scope').notNull(),
    stackable: boolean('stackable').notNull().default(false),
    discountType: couponDiscountTypeEnum('discount_type').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    status: couponStatusEnum('status').notNull().default('inactive'),
    note: text('note'),
    totalQuota: integer('total_quota'),
    issuedQuantity: integer('issued_quantity').notNull().default(0),
    perUserLimit: integer('per_user_limit'),
    grantOnRegister: boolean('grant_on_register').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponKeyUnique: uniqueIndex('coupons_coupon_key_unique').on(table.couponKey),
    codeUnique: uniqueIndex('coupons_code_unique').on(table.code),
    statusDatesIdx: index('coupons_status_dates_idx').on(table.status, table.startsAt, table.endsAt),
  }),
);

export const couponLocalePricing = pgTable(
  'coupon_locale_pricing',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    thresholdAmount: numeric('threshold_amount', { precision: 12, scale: 2 }),
    discountValue: numeric('discount_value', { precision: 12, scale: 4 }).notNull(),
    maxDiscountAmount: numeric('max_discount_amount', { precision: 12, scale: 2 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.locale] }),
    couponIdIdx: index('coupon_locale_pricing_coupon_id_idx').on(table.couponId),
  }),
);

export const couponCategories = pgTable(
  'coupon_categories',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.categoryId] }),
  }),
);

export const couponBrands = pgTable(
  'coupon_brands',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.brandId] }),
  }),
);

export const couponProducts = pgTable(
  'coupon_products',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.productId] }),
  }),
);

export const couponDistributionBatches = pgTable(
  'coupon_distribution_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'restrict' }),
    targetMode: couponDistributionTargetModeEnum('target_mode').notNull(),
    quantityPerUser: integer('quantity_per_user').notNull(),
    recipientCount: integer('recipient_count').notNull(),
    totalQuantity: integer('total_quantity').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponCreatedIdx: index('coupon_distribution_batches_coupon_created_idx').on(table.couponId, table.createdAt),
  }),
);

export const couponGrants = pgTable(
  'coupon_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    source: couponGrantSourceEnum('source').notNull(),
    batchId: uuid('batch_id').references(() => couponDistributionBatches.id, { onDelete: 'set null' }),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponCreatedIdx: index('coupon_grants_coupon_created_idx').on(table.couponId, table.createdAt),
    couponUserIdx: index('coupon_grants_coupon_user_idx').on(table.couponId, table.userId),
    batchIdx: index('coupon_grants_batch_idx').on(table.batchId),
  }),
);

export const geoDivisions = pgTable(
  'geo_divisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => geoDivisions.id, { onDelete: 'cascade' }),
    level: geoDivisionLevelEnum('level').notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    isoAlpha2: varchar('iso_alpha2', { length: 2 }),
    isoAlpha3: varchar('iso_alpha3', { length: 3 }),
    continentCode: varchar('continent_code', { length: 32 }),
    nameEn: varchar('name_en', { length: 200 }).notNull(),
    nameZh: varchar('name_zh', { length: 200 }),
    nameNative: varchar('name_native', { length: 200 }),
    nameEnTitle: varchar('name_en_title', { length: 200 }).notNull(),
    postalCode: varchar('postal_code', { length: 32 }),
    postalCodePattern: varchar('postal_code_pattern', { length: 120 }),
    sortOrder: integer('sort_order').notNull().default(0),
    enabled: boolean('enabled').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentCodeUnique: uniqueIndex('geo_divisions_parent_code_unique').on(table.parentId, table.code),
    parentIdx: index('geo_divisions_parent_idx').on(table.parentId),
    levelIdx: index('geo_divisions_level_idx').on(table.level),
    continentIdx: index('geo_divisions_continent_idx').on(table.continentCode),
    isoAlpha2Unique: uniqueIndex('geo_divisions_iso_alpha2_unique').on(table.isoAlpha2),
  }),
);

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

export const productFeatureAssignments = pgTable(
  'product_feature_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    definitionId: uuid('definition_id').notNull().references(() => featureDefinitions.id, { onDelete: 'restrict' }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productDefinitionUnique: uniqueIndex('product_feature_assignments_product_definition_unique').on(table.productId, table.definitionId),
    productIdIdx: index('product_feature_assignments_product_id_idx').on(table.productId),
  }),
);

export const productFeatureValues = pgTable(
  'product_feature_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assignmentId: uuid('assignment_id').notNull().references(() => productFeatureAssignments.id, { onDelete: 'cascade' }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assignmentIdIdx: index('product_feature_values_assignment_id_idx').on(table.assignmentId),
  }),
);

export const productFeatureValueTranslations = pgTable(
  'product_feature_value_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    valueId: uuid('value_id').notNull().references(() => productFeatureValues.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    valueText: text('value_text'),
    valueNumber: numeric('value_number', { precision: 12, scale: 4 }),
    valueBoolean: boolean('value_boolean'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    valueLocaleUnique: uniqueIndex('product_feature_value_translations_value_locale_unique').on(table.valueId, table.locale),
  }),
);

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
    configurationKey: varchar('configuration_key', { length: 64 }).notNull().default(''),
    featureSelections: jsonb('feature_selections').$type<Array<{
      definitionId: string;
      definitionKey: string;
      definitionName: string;
      valueId: string;
      display: string;
      unit?: string | null;
    }>>().notNull().default([]),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCartLine: uniqueIndex('cart_items_unique_line').on(table.cartId, table.productId, table.configurationKey),
  }),
);

export const addresses = pgTable(
  'addresses',
  {
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
  },
  (table) => ({
    userIdIdx: index('addresses_user_id_idx').on(table.userId),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    status: orderStatusEnum('status').notNull().default('unpaid'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    shippingStatus: shippingStatusEnum('shipping_status').notNull().default('unshipped'),
    refundStatus: refundStatusEnum('refund_status').notNull().default('none'),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingAmount: numeric('shipping_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingMethod: varchar('shipping_method', { length: 100 }),
    paymentMethod: varchar('payment_method', { length: 100 }),
    customerNote: text('customer_note'),
    shippingAddressId: uuid('shipping_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    billingAddressId: uuid('billing_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    internalNote: text('internal_note'),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedBy: uuid('terminated_by').references(() => admins.id, { onDelete: 'set null' }),
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
  spu: varchar('spu', { length: 100 }).notNull(),
  variantLabel: varchar('variant_label', { length: 255 }),
  featureSelections: jsonb('feature_selections').$type<Array<{
    definitionId: string;
    definitionKey: string;
    definitionName: string;
    valueId: string;
    display: string;
    unit?: string | null;
  }>>().notNull().default([]),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderShipments = pgTable('order_shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  trackingNumber: varchar('tracking_number', { length: 120 }).notNull(),
  shippedAt: timestamp('shipped_at', { withTimezone: true }).notNull(),
  note: text('note'),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderShipmentItems = pgTable(
  'order_shipment_items',
  {
    shipmentId: uuid('shipment_id').notNull().references(() => orderShipments.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.shipmentId, table.orderItemId], name: 'order_shipment_items_pk' }),
  }),
);

export const orderCouponRedemptions = pgTable('order_coupon_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  couponCode: varchar('coupon_code', { length: 64 }).notNull(),
  couponName: varchar('coupon_name', { length: 255 }),
  discountType: varchar('discount_type', { length: 32 }).notNull(),
  discountValue: numeric('discount_value', { precision: 12, scale: 4 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  scopeSummary: text('scope_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderRefundRequests = pgTable('order_refund_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  refundType: refundTypeEnum('refund_type').notNull(),
  returnType: returnTypeEnum('return_type').notNull(),
  reason: text('reason'),
  requestedAmount: numeric('requested_amount', { precision: 12, scale: 2 }),
  processedAmount: numeric('processed_amount', { precision: 12, scale: 2 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedBy: uuid('processed_by').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderActionLogs = pgTable('order_action_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  actionType: orderActionTypeEnum('action_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inquiries = pgTable(
  'inquiries',
  {
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
    salesStatus: inquirySalesStatusEnum('sales_status').notNull().default('unset'),
    awaitingAdmin: boolean('awaiting_admin').notNull().default(true),
    queueKind: inquiryQueueKindEnum('queue_kind'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedBy: uuid('terminated_by').references(() => admins.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    sourcePageUrl: text('source_page_url'),
    handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'set null' }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    internalNote: text('internal_note'),
    quoteNumber: varchar('quote_number', { length: 32 }),
    rfqPayload: jsonb('rfq_payload').$type<Record<string, unknown>>(),
    quotedLines: jsonb('quoted_lines').$type<Record<string, unknown>[]>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    awaitingAdminIdx: index('inquiries_awaiting_admin_idx').on(table.awaitingAdmin),
    lastMessageAtIdx: index('inquiries_last_message_at_idx').on(table.lastMessageAt),
    quoteNumberUnique: uniqueIndex('inquiries_quote_number_unique').on(table.quoteNumber),
  }),
);

export const inquiryMessages = pgTable(
  'inquiry_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id').notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
    senderType: inquiryMessageSenderTypeEnum('sender_type').notNull(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inquiryCreatedIdx: index('inquiry_messages_inquiry_created_idx').on(table.inquiryId, table.createdAt),
  }),
);

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

export const compareItems = pgTable(
  'compare_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCompareItem: uniqueIndex('compare_items_user_product_unique').on(table.userId, table.productId),
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

export const editorialContentBoards = pgTable(
  'editorial_content_boards',
  {
    contentId: uuid('content_id').notNull().references(() => editorialContents.id, { onDelete: 'cascade' }),
    boardKey: varchar('board_key', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentId, table.boardKey], name: 'editorial_content_boards_pk' }),
    boardKeyIdx: index('editorial_content_boards_board_key_idx').on(table.boardKey),
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
      coverStyle: null,
      tags: [],
      relatedProductSlugs: [],
      authorName: null,
      authorTitle: null,
      authorBio: null,
      category: null,
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
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    shortDescription: text('short_description'),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    moq: integer('moq').notNull().default(1),
    leadTimeMin: integer('lead_time_min').notNull().default(3),
    leadTimeMax: integer('lead_time_max').notNull().default(15),
    leadTimeUnit: varchar('lead_time_unit', { length: 20 }).notNull().default('business_days'),
    lifecycleStatus: productLifecycleEnum('lifecycle_status').notNull().default('active'),
    eolDate: timestamp('eol_date', { withTimezone: true }),
    lastTimeBuyDate: timestamp('last_time_buy_date', { withTimezone: true }),
    efficiencyClass: varchar('efficiency_class', { length: 20 }),
    payload: jsonb('payload').$type<AdminProductPayload>().notNull().default({
      coverUrl: null,
      coverAlt: null,
      gallery: [],
      tags: [],
      attachments: [],
      certifications: [],
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productLocaleUnique: uniqueIndex('product_translations_product_locale_unique').on(table.productId, table.locale),
    slugLocaleUnique: uniqueIndex('product_translations_slug_locale_unique').on(table.slug, table.locale),
    productIdIdx: index('product_translations_product_id_idx').on(table.productId),
  }),
);
