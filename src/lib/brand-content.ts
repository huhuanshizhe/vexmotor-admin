export const brandStatuses = ['active', 'inactive'] as const;

export type BrandStatus = (typeof brandStatuses)[number];

export type AdminBrandPayload = {
  tags: string[];
};

/** 列表行：一条品牌对应一行 */
export type AdminBrandListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: BrandStatus;
  productCount: number;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

/** 单语言翻译（编辑弹窗） */
export type AdminBrandTranslation = {
  id: string;
  brandId: string;
  locale: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: BrandStatus;
  payload: AdminBrandPayload;
  createdAt: string;
  updatedAt: string;
};

export function resolveBrandId(item: Pick<AdminBrandTranslation, 'brandId'>) {
  return item.brandId;
}
