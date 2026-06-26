export type BrandPickerItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};

export type BrandPickerListQuery = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type BrandPickerListResult = {
  items: BrandPickerItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type BrandSelectedDisplay = {
  name: string;
  subtitle: string | null;
};

export function formatBrandSelectedDisplay(item: BrandPickerItem): BrandSelectedDisplay {
  const parts: string[] = [];
  if (item.slug.trim()) parts.push(item.slug);
  parts.push(`${item.productCount} 个商品`);
  return {
    name: item.name,
    subtitle: parts.join(' · '),
  };
}

export function buildBrandPickerQueryString(params: BrandPickerListQuery) {
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 50) query.set('page_size', String(params.pageSize));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
