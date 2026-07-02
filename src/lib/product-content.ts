export type FaqItem = {
  question: string;
  answer: string;
};

export const productStatuses = ['active', 'inactive'] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productLifecycleStatuses = ['new', 'active', 'nfd', 'eol', 'last_time_buy'] as const;
export type ProductLifecycleStatus = (typeof productLifecycleStatuses)[number];

export const productPurchaseModes = ['buy', 'inquiry'] as const;
export type ProductPurchaseMode = (typeof productPurchaseModes)[number];

export const leadTimeUnits = ['business_days', 'calendar_days', 'weeks'] as const;
export type LeadTimeUnit = (typeof leadTimeUnits)[number];

export type ProductGalleryImage = {
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

export type ProductAttachment = {
  name: string;
  url: string;
  mimeType: string;
};

export type AdminProductPayload = {
  coverUrl: string | null;
  coverAlt: string | null;
  gallery: ProductGalleryImage[];
  tags: string[];
  attachments: ProductAttachment[];
  certifications: string[];
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  spu: string;
  coverUrl: string | null;
  purchaseMode: ProductPurchaseMode;
  stockQuantity: number;
  price: string;
  currencyCode: string;
  status: ProductStatus;
  lifecycleStatus: ProductLifecycleStatus;
  brandId: string | null;
  brandName: string | null;
  defaultCategoryId: string | null;
  categoryIds: string[];
  categoryName: string | null;
  featured: boolean;
  paidSampleEnabled: boolean;
  hasMultipleSpecs: boolean;
  featureCount: number;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  boardKey: string | null;
  boardKeys: string[];
  boardLabels: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminProductTranslation = {
  id: string;
  productId: string;
  locale: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  stockQuantity: number;
  moq: number;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  lifecycleStatus: ProductLifecycleStatus;
  eolDate: string | null;
  lastTimeBuyDate: string | null;
  efficiencyClass: string | null;
  payload: AdminProductPayload;
  spu: string;
  brandId: string | null;
  defaultCategoryId: string | null;
  purchaseMode: ProductPurchaseMode;
  paidSampleEnabled: boolean;
  featured: boolean;
  featuredSortOrder: number;
  hasMultipleSpecs: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export function resolveProductId(item: Pick<AdminProductTranslation, 'productId'>) {
  return item.productId;
}

export function defaultProductPayload(): AdminProductPayload {
  return {
    coverUrl: null,
    coverAlt: null,
    gallery: [],
    tags: [],
    attachments: [],
    certifications: [],
  };
}
