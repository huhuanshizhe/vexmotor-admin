import { randomUUID } from 'node:crypto';

import { getMemoryAdminInquiries } from '@/server/storefront/inquiries';
import { getMemoryAdminOrders } from '@/server/storefront/cart';
import { getSeedCategories, getSeedProductById, getSeedProductsResult } from '@/server/storefront/seed';

export type AdminMemoryCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'active' | 'inactive';
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMemoryBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMemoryProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  purchaseMode: 'buy' | 'inquiry';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  stockQuantity: number;
  moq: number;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  lifecycleStatus: string;
  eolDate: string | null;
  lastTimeBuyDate: string | null;
  efficiencyClass: string | null;
  certifications: string[] | null;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  featured: boolean;
  brandId: string | null;
  defaultCategoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
    isPrimary: boolean;
  }>;
  features: Array<{
    id: string;
    featureKey: string;
    featureValue: string;
    featureValueMin: number | null;
    featureValueMax: number | null;
    valueType: string;
    conditionalValue: Record<string, unknown> | null;
    unit: string | null;
    specCategory: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;
  compatibleProducts: Array<{
    id: string;
    relatedProductId: string;
    relatedProductName: string;
    relatedProductSku: string;
    relationType: 'drivers' | 'mechanical-integration' | 'power-control' | 'custom';
    relationLabel: string | null;
    sortOrder: number;
  }>;
  configurationRules: unknown | null;
  torqueCurveData: unknown | null;
  paidSampleEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMemoryCustomer = {
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

export type AdminMemoryContentBlock = {
  id: string;
  placement: string;
  blockKey: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMemoryCmsPage = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AdminMemoryStore = {
  categories: AdminMemoryCategory[];
  brands: AdminMemoryBrand[];
  products: AdminMemoryProduct[];
  customers: AdminMemoryCustomer[];
  contentBlocks: AdminMemoryContentBlock[];
  cmsPages: AdminMemoryCmsPage[];
};

declare global {
  var __vexmotorAdminMemoryStore__: AdminMemoryStore | undefined;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function formatAmount(value: number | null | undefined) {
  if (value == null) {
    return null;
  }

  return value.toFixed(2);
}

function buildInitialBrands(): AdminMemoryBrand[] {
  const seedCards = getSeedProductsResult({ pageSize: 200 }).items;
  const uniqueBrands = new Map<string, AdminMemoryBrand>();

  for (const card of seedCards) {
    if (!card.brand) {
      continue;
    }

    if (!uniqueBrands.has(card.brand.id)) {
      uniqueBrands.set(card.brand.id, {
        id: card.brand.id,
        name: card.brand.name,
        slug: card.brand.slug,
        description: '自有工业运动控制品牌，提供步进电机、驱动器与传动件目录化供货。',
        logoUrl: card.brand.logo?.url ?? null,
        websiteUrl: 'https://www.vexmotor.com',
        status: 'active',
        createdAt: daysAgo(180),
        updatedAt: daysAgo(2),
      });
    }
  }

  uniqueBrands.set('brand-2', {
    id: 'brand-2',
    name: 'STEPMOTECH OEM',
    slug: 'stepmotech-oem',
    description: '面向 OEM 项目与联合开发的配套品牌档案。',
    logoUrl: null,
    websiteUrl: 'https://www.vexmotor.com/oem',
    status: 'active',
    createdAt: daysAgo(120),
    updatedAt: daysAgo(8),
  });

  uniqueBrands.set('brand-3', {
    id: 'brand-3',
    name: 'MotionLine',
    slug: 'motionline',
    description: '用于扩展线性模组与电控配件的内部品牌占位。',
    logoUrl: null,
    websiteUrl: null,
    status: 'inactive',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  });

  return Array.from(uniqueBrands.values());
}

function buildInitialCategories(): AdminMemoryCategory[] {
  const seedCategories = getSeedCategories();
  return seedCategories.map((category, index) => ({
    id: category.id,
    parentId: category.parentId ?? null,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    imageUrl: category.image?.url ?? null,
    seoTitle: category.name,
    seoDescription: category.description ?? null,
    status: 'active',
    sortOrder: index + 1,
    isFeatured: category.isFeatured ?? false,
    featuredOrder: category.featuredOrder ?? 0,
    createdAt: daysAgo(200 - index * 6),
    updatedAt: daysAgo(index + 1),
  }));
}

function buildInitialProducts(): AdminMemoryProduct[] {
  const seedCards = getSeedProductsResult({ pageSize: 200 }).items;

  return seedCards.map((card, index) => {
    const detail = getSeedProductById(card.id);
    if (!detail) {
      throw new Error(`Missing seed product detail for ${card.id}`);
    }

    return {
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      sku: detail.sku,
      shortDescription: detail.shortDescription ?? null,
      description: detail.description ?? null,
      purchaseMode: detail.purchaseMode,
      status: 'active',
      stockQuantity: detail.stockQuantity,
      moq: detail.moq ?? 1,
      leadTimeMin: detail.leadTimeMin ?? 3,
      leadTimeMax: detail.leadTimeMax ?? 15,
      leadTimeUnit: detail.leadTimeUnit ?? 'business_days',
      lifecycleStatus: detail.lifecycleStatus ?? 'active',
      eolDate: detail.eolDate ?? null,
      lastTimeBuyDate: detail.lastTimeBuyDate ?? null,
      efficiencyClass: detail.efficiencyClass ?? null,
      certifications: detail.certifications ?? [],
      configurationRules: null,
      torqueCurveData: null,
      paidSampleEnabled: false,
      price: detail.price.amount.toFixed(2),
      compareAtPrice: formatAmount(detail.compareAtPrice?.amount),
      currencyCode: detail.price.currency,
      featured: index < 4,
      brandId: detail.brand?.id ?? null,
      defaultCategoryId: detail.categories[0]?.id ?? null,
      seoTitle: detail.seoTitle ?? null,
      seoDescription: detail.seoDescription ?? null,
      images: detail.gallery.map((image, imageIndex) => ({
        id: `${detail.id}-img-${imageIndex + 1}`,
        url: image.url,
        alt: image.alt,
        width: image.width ?? null,
        height: image.height ?? null,
        isPrimary: image.id === detail.coverImage?.id || imageIndex === 0,
      })),
      features: detail.features.map((feature, featureIndex) => ({
        id: `${detail.id}-feature-${featureIndex + 1}`,
        featureKey: feature.key,
        featureValue: feature.value,
        featureValueMin: feature.valueMin ?? null,
        featureValueMax: feature.valueMax ?? null,
        valueType: feature.valueType ?? 'text',
        conditionalValue: (feature.conditionalValue as Record<string, unknown>) ?? null,
        unit: feature.unit ?? null,
        specCategory: feature.category ?? 'general',
      })),
      attachments: detail.attachments.map((attachment, attachmentIndex) => ({
        id: `${detail.id}-attachment-${attachmentIndex + 1}`,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
      })),
      compatibleProducts: [],
      createdAt: daysAgo(160 - index * 5),
      updatedAt: daysAgo(index + 1),
    };
  });
}

function buildInitialCustomers(): AdminMemoryCustomer[] {
  return [
    {
      id: 'cust-1',
      email: 'procurement@atlas-automation.com',
      firstName: 'Lina',
      lastName: 'Zhang',
      company: 'Atlas Automation',
      phone: '+86 755 8650 2101',
      avatarUrl: null,
      role: 'customer',
      status: 'active',
      emailVerifiedAt: daysAgo(58),
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
      orderCount: 6,
      inquiryCount: 3,
      addressCount: 2,
      wishlistCount: 4,
      totalSpent: 5240,
    },
    {
      id: 'cust-2',
      email: 'engineering@northpeak-cnc.com',
      firstName: 'Daniel',
      lastName: 'Miller',
      company: 'NorthPeak CNC',
      phone: '+1 425 555 0182',
      avatarUrl: null,
      role: 'customer',
      status: 'pending',
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(2),
      orderCount: 0,
      inquiryCount: 2,
      addressCount: 1,
      wishlistCount: 1,
      totalSpent: 0,
    },
    {
      id: 'cust-3',
      email: 'buyer@delta-motion.eu',
      firstName: 'Eva',
      lastName: 'Schmidt',
      company: 'Delta Motion GmbH',
      phone: '+49 30 5555 1888',
      avatarUrl: null,
      role: 'customer',
      status: 'disabled',
      emailVerifiedAt: daysAgo(118),
      lastLoginAt: daysAgo(46),
      createdAt: daysAgo(120),
      updatedAt: daysAgo(20),
      orderCount: 4,
      inquiryCount: 1,
      addressCount: 3,
      wishlistCount: 0,
      totalSpent: 3180,
    },
    {
      id: 'cust-4',
      email: 'ops-admin@vexmotor.com',
      firstName: 'Vex',
      lastName: 'Admin',
      company: 'VexMotor',
      phone: '+86 400 820 6000',
      avatarUrl: null,
      role: 'admin',
      status: 'active',
      emailVerifiedAt: daysAgo(300),
      lastLoginAt: daysAgo(0),
      createdAt: daysAgo(320),
      updatedAt: daysAgo(0),
      orderCount: 0,
      inquiryCount: 0,
      addressCount: 0,
      wishlistCount: 0,
      totalSpent: 0,
    },
  ];
}

function buildInitialContentBlocks(): AdminMemoryContentBlock[] {
  return [
    {
      id: 'block-1',
      placement: 'home.hero',
      blockKey: 'main-banner',
      title: '工程级运动控制产品，现货与定制并行',
      subtitle: '支持步进电机、驱动器、电源、线性模组与 OEM 项目询价。',
      content: {
        primaryActionLabel: '查看产品',
        primaryActionHref: '/products',
        secondaryActionLabel: '联系工厂',
        secondaryActionHref: '/contact',
      },
      status: 'active',
      sortOrder: 1,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(2),
    },
    {
      id: 'block-2',
      placement: 'home.trust',
      blockKey: 'global-shipping',
      title: '全球交付能力',
      subtitle: '标准品快速出货，支持多批次与出口包装。',
      content: { badge: '48h 内响应', icon: 'rocket' },
      status: 'active',
      sortOrder: 2,
      createdAt: daysAgo(35),
      updatedAt: daysAgo(4),
    },
    {
      id: 'block-3',
      placement: 'home.industry',
      blockKey: 'automation',
      title: '工业自动化',
      subtitle: '覆盖 CNC、包装、点胶、输送与协作机器人。',
      content: { image: '/images/industry-automation.jpg', emphasis: '高精度' },
      status: 'active',
      sortOrder: 3,
      createdAt: daysAgo(32),
      updatedAt: daysAgo(3),
    },
    {
      id: 'block-4',
      placement: 'footer.cta',
      blockKey: 'rfq-service',
      title: '需要配套选型或定制项目？',
      subtitle: '提交应用需求，我们会按工况回传规格建议与报价。',
      content: { actionLabel: '提交询盘', actionHref: '/contact' },
      status: 'inactive',
      sortOrder: 4,
      createdAt: daysAgo(28),
      updatedAt: daysAgo(6),
    },
  ];
}

function buildInitialCmsPages(): AdminMemoryCmsPage[] {
  return [
    {
      id: 'page-1',
      title: '关于我们',
      slug: 'about',
      summary: '介绍品牌能力、工厂配套与全球服务。',
      content: 'VexMotor 专注于工业运动控制产品的目录化销售与 OEM 配套。',
      seoTitle: '关于 VexMotor',
      seoDescription: '了解 VexMotor 的品牌能力与工业运动控制交付能力。',
      status: 'published',
      publishedAt: daysAgo(30),
      createdAt: daysAgo(35),
      updatedAt: daysAgo(5),
    },
    {
      id: 'page-2',
      title: '常见问题',
      slug: 'faq',
      summary: '整理 MOQ、交付、认证与技术支持常见问题。',
      content: 'FAQ 页面内容占位，可在后台持续维护。',
      seoTitle: '常见问题',
      seoDescription: '查看下单、交期、认证与技术支持等常见问题。',
      status: 'published',
      publishedAt: daysAgo(20),
      createdAt: daysAgo(24),
      updatedAt: daysAgo(2),
    },
    {
      id: 'page-3',
      title: '认证与质量',
      slug: 'certification',
      summary: '展示质量控制、测试能力与合规资料。',
      content: '认证页面内容占位，用于统一维护测试标准与证书资料。',
      seoTitle: '认证与质量',
      seoDescription: '了解产品测试流程、质量控制与认证信息。',
      status: 'draft',
      publishedAt: null,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(1),
    },
  ];
}

function buildInitialAdminMemoryStore(): AdminMemoryStore {
  return {
    categories: buildInitialCategories(),
    brands: buildInitialBrands(),
    products: buildInitialProducts(),
    customers: buildInitialCustomers(),
    contentBlocks: buildInitialContentBlocks(),
    cmsPages: buildInitialCmsPages(),
  };
}

export function getAdminMemoryStore() {
  if (!globalThis.__vexmotorAdminMemoryStore__) {
    globalThis.__vexmotorAdminMemoryStore__ = buildInitialAdminMemoryStore();
  }

  return globalThis.__vexmotorAdminMemoryStore__;
}

function byUpdatedDesc<T extends { updatedAt: Date; createdAt: Date }>(left: T, right: T) {
  return right.updatedAt.getTime() - left.updatedAt.getTime() || right.createdAt.getTime() - left.createdAt.getTime();
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

export function listMemoryProducts(search = '') {
  const keyword = normalizeKeyword(search);
  const store = getAdminMemoryStore();

  return [...store.products]
    .filter((item) => {
      if (!keyword) {
        return true;
      }

      return [item.name, item.slug, item.sku, item.shortDescription ?? '', item.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    })
    .sort(byUpdatedDesc);
}

export function getMemoryProduct(id: string) {
  return getAdminMemoryStore().products.find((item) => item.id === id) ?? null;
}

export function createMemoryProduct(
  input: Omit<AdminMemoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'features' | 'attachments' | 'compatibleProducts'> & {
    images: Array<Omit<AdminMemoryProduct['images'][number], 'id'>>;
    features: Array<Omit<AdminMemoryProduct['features'][number], 'id'>>;
    attachments: Array<Omit<AdminMemoryProduct['attachments'][number], 'id'>>;
    compatibleProducts?: Array<Omit<AdminMemoryProduct['compatibleProducts'][number], 'id' | 'relatedProductName' | 'relatedProductSku'>>;
  },
) {
  const now = new Date();
  const store = getAdminMemoryStore();
  const created: AdminMemoryProduct = {
    ...input,
    id: randomUUID(),
    images: input.images.map((item) => ({ ...item, id: randomUUID() })),
    features: input.features.map((item) => ({ ...item, id: randomUUID() })),
    attachments: input.attachments.map((item) => ({ ...item, id: randomUUID() })),
    compatibleProducts: (input.compatibleProducts ?? []).map((item) => {
      const related = store.products.find((p) => p.id === item.relatedProductId);
      return {
        id: randomUUID(),
        relatedProductId: item.relatedProductId,
        relatedProductName: related?.name ?? '',
        relatedProductSku: related?.sku ?? '',
        relationType: item.relationType,
        relationLabel: item.relationLabel,
        sortOrder: item.sortOrder,
      };
    }),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().products.unshift(created);
  return created;
}

export function updateMemoryProduct(
  id: string,
  input: Partial<Omit<AdminMemoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'features' | 'attachments' | 'compatibleProducts'>> & {
    images?: Array<Omit<AdminMemoryProduct['images'][number], 'id'>>;
    features?: Array<Omit<AdminMemoryProduct['features'][number], 'id'>>;
    attachments?: Array<Omit<AdminMemoryProduct['attachments'][number], 'id'>>;
    compatibleProducts?: Array<Omit<AdminMemoryProduct['compatibleProducts'][number], 'id' | 'relatedProductName' | 'relatedProductSku'>>;
  },
) {
  const store = getAdminMemoryStore();
  const target = store.products.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, {
    images: input.images ? input.images.map((item) => ({ ...item, id: randomUUID() })) : target.images,
    features: input.features ? input.features.map((item) => ({ ...item, id: randomUUID() })) : target.features,
    attachments: input.attachments ? input.attachments.map((item) => ({ ...item, id: randomUUID() })) : target.attachments,
    compatibleProducts: input.compatibleProducts
      ? input.compatibleProducts.map((item) => {
          const related = store.products.find((p) => p.id === item.relatedProductId);
          return {
            id: randomUUID(),
            relatedProductId: item.relatedProductId,
            relatedProductName: related?.name ?? '',
            relatedProductSku: related?.sku ?? '',
            relationType: item.relationType,
            relationLabel: item.relationLabel,
            sortOrder: item.sortOrder,
          };
        })
      : target.compatibleProducts,
    updatedAt: new Date(),
  });

  return target;
}

export function deleteMemoryProduct(id: string) {
  const store = getAdminMemoryStore();
  const next = store.products.filter((item) => item.id !== id);
  if (next.length === store.products.length) {
    return false;
  }

  store.products = next;
  return true;
}

export function listMemoryCategories() {
  return [...getAdminMemoryStore().categories].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function getMemoryCategory(id: string) {
  return getAdminMemoryStore().categories.find((item) => item.id === id) ?? null;
}

export function createMemoryCategory(input: Omit<AdminMemoryCategory, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const created: AdminMemoryCategory = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().categories.push(created);
  return created;
}

export function updateMemoryCategory(id: string, input: Partial<Omit<AdminMemoryCategory, 'id' | 'createdAt' | 'updatedAt'>>) {
  const target = getAdminMemoryStore().categories.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, { updatedAt: new Date() });
  return target;
}

export function deleteMemoryCategory(id: string) {
  const store = getAdminMemoryStore();
  const exists = store.categories.some((item) => item.id === id);
  if (!exists) {
    return false;
  }

  store.categories = store.categories.filter((item) => item.id !== id);
  for (const category of store.categories) {
    if (category.parentId === id) {
      category.parentId = null;
      category.updatedAt = new Date();
    }
  }

  for (const product of store.products) {
    if (product.defaultCategoryId === id) {
      product.defaultCategoryId = null;
      product.updatedAt = new Date();
    }
  }

  return true;
}

export function listMemoryBrands() {
  return [...getAdminMemoryStore().brands].sort((left, right) => left.name.localeCompare(right.name));
}

export function getMemoryBrand(id: string) {
  return getAdminMemoryStore().brands.find((item) => item.id === id) ?? null;
}

export function createMemoryBrand(input: Omit<AdminMemoryBrand, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const created: AdminMemoryBrand = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().brands.push(created);
  return created;
}

export function updateMemoryBrand(id: string, input: Partial<Omit<AdminMemoryBrand, 'id' | 'createdAt' | 'updatedAt'>>) {
  const target = getAdminMemoryStore().brands.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, { updatedAt: new Date() });
  return target;
}

export function deleteMemoryBrand(id: string) {
  const store = getAdminMemoryStore();
  const exists = store.brands.some((item) => item.id === id);
  if (!exists) {
    return false;
  }

  store.brands = store.brands.filter((item) => item.id !== id);
  for (const product of store.products) {
    if (product.brandId === id) {
      product.brandId = null;
      product.updatedAt = new Date();
    }
  }

  return true;
}

export function listMemoryCustomers() {
  return [...getAdminMemoryStore().customers].sort(byUpdatedDesc);
}

export function getMemoryCustomer(id: string) {
  return getAdminMemoryStore().customers.find((item) => item.id === id) ?? null;
}

export function createMemoryCustomer(input: Omit<AdminMemoryCustomer, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const created: AdminMemoryCustomer = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().customers.unshift(created);
  return created;
}

export function updateMemoryCustomer(id: string, input: Partial<Omit<AdminMemoryCustomer, 'id' | 'createdAt' | 'updatedAt'>>) {
  const target = getAdminMemoryStore().customers.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, { updatedAt: new Date() });
  return target;
}

export function listMemoryContentBlocks() {
  return [...getAdminMemoryStore().contentBlocks].sort((left, right) => left.sortOrder - right.sortOrder || byUpdatedDesc(left, right));
}

export function getMemoryContentBlock(id: string) {
  return getAdminMemoryStore().contentBlocks.find((item) => item.id === id) ?? null;
}

export function createMemoryContentBlock(input: Omit<AdminMemoryContentBlock, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const created: AdminMemoryContentBlock = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().contentBlocks.push(created);
  return created;
}

export function updateMemoryContentBlock(id: string, input: Partial<Omit<AdminMemoryContentBlock, 'id' | 'createdAt' | 'updatedAt'>>) {
  const target = getAdminMemoryStore().contentBlocks.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, { updatedAt: new Date() });
  return target;
}

export function deleteMemoryContentBlock(id: string) {
  const store = getAdminMemoryStore();
  const next = store.contentBlocks.filter((item) => item.id !== id);
  if (next.length === store.contentBlocks.length) {
    return false;
  }

  store.contentBlocks = next;
  return true;
}

export function listMemoryCmsPages() {
  return [...getAdminMemoryStore().cmsPages].sort(byUpdatedDesc);
}

export function getMemoryCmsPage(id: string) {
  return getAdminMemoryStore().cmsPages.find((item) => item.id === id) ?? null;
}

export function createMemoryCmsPage(input: Omit<AdminMemoryCmsPage, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const created: AdminMemoryCmsPage = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getAdminMemoryStore().cmsPages.unshift(created);
  return created;
}

export function updateMemoryCmsPage(id: string, input: Partial<Omit<AdminMemoryCmsPage, 'id' | 'createdAt' | 'updatedAt'>>) {
  const target = getAdminMemoryStore().cmsPages.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, input, { updatedAt: new Date() });
  return target;
}

export function deleteMemoryCmsPage(id: string) {
  const store = getAdminMemoryStore();
  const next = store.cmsPages.filter((item) => item.id !== id);
  if (next.length === store.cmsPages.length) {
    return false;
  }

  store.cmsPages = next;
  return true;
}

export function getMemoryProductCountForCategory(categoryId: string) {
  return getAdminMemoryStore().products.filter((item) => item.defaultCategoryId === categoryId).length;
}

export function getMemoryProductCountForBrand(brandId: string) {
  return getAdminMemoryStore().products.filter((item) => item.brandId === brandId).length;
}

export function getMemoryAdminDashboardData() {
  const store = getAdminMemoryStore();
  const orders = getMemoryAdminOrders();
  const inquiries = getMemoryAdminInquiries();
  const activeProducts = store.products.filter((item) => item.status === 'active').length;
  const lowStockProducts = store.products.filter((item) => item.stockQuantity <= 20 && item.status === 'active').length;
  const publishedPages = store.cmsPages.filter((item) => item.status === 'published').length;
  const activeBlocks = store.contentBlocks.filter((item) => item.status === 'active').length;
  const pendingCustomers = store.customers.filter((item) => item.status === 'pending').length;
  const pendingOrders = orders.filter((item) => item.status === 'pending' || item.status === 'processing').length;
  const openInquiries = inquiries.filter((item) => item.status === 'new' || item.status === 'contacted').length;
  const paidRevenue = orders
    .filter((item) => ['paid', 'processing', 'shipped', 'completed'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.totalAmount), 0);

  return {
    metrics: {
      activeProducts,
      totalCategories: store.categories.length,
      totalBrands: store.brands.length,
      totalCustomers: store.customers.length,
      pendingCustomers,
      totalOrders: orders.length,
      pendingOrders,
      totalInquiries: inquiries.length,
      openInquiries,
      lowStockProducts,
      activeBlocks,
      publishedPages,
      paidRevenue,
    },
    recentOrders: orders.slice(0, 5),
    recentInquiries: inquiries.slice(0, 5),
    lowStockItems: [...store.products]
      .filter((item) => item.status === 'active' && item.stockQuantity <= 20)
      .sort((left, right) => left.stockQuantity - right.stockQuantity)
      .slice(0, 5),
  };
}
