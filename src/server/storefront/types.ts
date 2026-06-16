export type StorefrontImage = {
  id: string;
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  isDimension?: boolean;
  imageType?: string | null;
};

export type StorefrontBrand = {
  id: string;
  name: string;
  slug: string;
  logo?: StorefrontImage | null;
};

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: StorefrontImage | null;
  parentId?: string | null;
  productCount?: number;
  isFeatured?: boolean;
  featuredOrder?: number;
};

export type StorefrontProductCard = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  coverImage?: StorefrontImage | null;
  price: {
    currency: string;
    amount: number;
    formatted: string;
  };
  compareAtPrice?: {
    currency: string;
    amount: number;
    formatted: string;
  } | null;
  purchaseMode: 'buy' | 'inquiry';
  inStock: boolean;
  brand?: StorefrontBrand | null;
  moq?: number;
  leadTimeMin?: number;
  leadTimeMax?: number;
  leadTimeUnit?: string;
  lifecycleStatus?: string;
};

export type ProductListSort = 'featured' | 'name-asc' | 'price-asc' | 'price-desc' | 'newest';

export type StorefrontFeature = {
  key: string;
  value: string;
  unit?: string | null;
  category?: string; // electrical, mechanical, performance, environmental, general
  valueMin?: number | null;
  valueMax?: number | null;
  valueType?: string; // text | number | range | boolean | select
  conditionalValue?: Record<string, unknown> | null;
};

export type StorefrontAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
};

export type StorefrontCompatibleGroup = {
  relationType: string;
  title: string;
  items: StorefrontProductCard[];
};

export type StorefrontProductDetail = StorefrontProductCard & {
  description: string;
  descriptionLong?: string | null;
  gallery: StorefrontImage[];
  categories: StorefrontCategory[];
  attributes: Array<{ group: string; value: string }>;
  attachments: StorefrontAttachment[];
  relatedProducts: StorefrontProductCard[];
  compatibleGroups: StorefrontCompatibleGroup[];
  stockQuantity: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  features: StorefrontFeature[];
  moq: number;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  lifecycleStatus: string;
  eolDate?: string | null;
  lastTimeBuyDate?: string | null;
  efficiencyClass?: string | null;
  certifications?: string[];
  configurationRules?: unknown | null;
  torqueCurveData?: unknown | null;
  paidSampleEnabled?: boolean;
};

export type ProductListResult = {
  items: StorefrontProductCard[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  facets: Array<{ key: string; label: string; options: Array<{ label: string; value: string; count: number }> }>;
};

export type StorefrontLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: StorefrontLink[];
};

export type StorefrontUtilityLink = {
  label: string;
  href: string;
  external?: boolean;
  variant?: 'default' | 'pill' | 'pill-secondary';
};

export type StorefrontServiceHighlight = {
  title: string;
  description: string;
};

export type NewsletterModule = {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
};

export type BrandStory = {
  title: string;
  description: string;
};

export type FooterContactBlock = {
  title: string;
  lines: string[];
  href?: string;
  external?: boolean;
};

export type NavigationData = {
  utilityLinks: StorefrontUtilityLink[];
  mainLinks: StorefrontLink[];
  categories: StorefrontCategory[];
};

export type SupportPageSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type SupportPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
    external?: boolean;
  };
  secondaryAction?: {
    label: string;
    href: string;
    external?: boolean;
  };
  sections: SupportPageSection[];
};

export type HomeCategoryGroup = {
  id: string;
  title: string;
  items: Array<{
    id: string;
    label: string;
    href: string;
  }>;
};

export type HomeSellingPoint = {
  id: string;
  title: string;
  description: string;
};

export type HomeShelfProduct = StorefrontProductCard & {
  tag?: string | null;
  note?: string | null;
};

export type HomeProductShelf = {
  id: string;
  title: string;
  items: HomeShelfProduct[];
};

export type HomeFooterSection = {
  id: string;
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
};

export type HomeData = {
  heroBanners: Array<{
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    primaryAction: { label: string; href: string };
    secondaryAction: { label: string; href: string };
  }>;
  featuredCategories: StorefrontCategory[];
  hotSale: StorefrontProductCard[];
  newRelease: StorefrontProductCard[];
  featuredIndustries: Array<{ title: string; description: string }>;
  testimonials: Array<{ author: string; quote: string }>;
  trustHighlights: StorefrontServiceHighlight[];
  categoryGroups: HomeCategoryGroup[];
  sellingPoints: HomeSellingPoint[];
  featuredShelves: HomeProductShelf[];
  mostViewedProducts: StorefrontProductCard[];
  newsletter: NewsletterModule;
  brandStory: BrandStory;
  footerSections: HomeFooterSection[];
  footerContact: FooterContactBlock[];
  paymentMethods: string[];
  copyright: string;
};
