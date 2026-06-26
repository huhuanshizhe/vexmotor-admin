import { formatAdminMoney } from '@/lib/admin-display';
import type { ProductStatus } from '@/lib/product-content';
import type { AdminListPageSize } from '@/lib/admin-list-query';

export type ProductPickerItem = {
  id: string;
  name: string;
  spu: string;
  coverUrl: string | null;
  brandName: string | null;
  categoryName: string | null;
  price: string;
  currencyCode: string;
  status: ProductStatus;
};

export type ProductPickerListQuery = {
  keyword?: string;
  page?: number;
  pageSize?: AdminListPageSize;
  brandId?: string;
  categoryId?: string;
};

export type ProductPickerListResult = {
  items: ProductPickerItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductSelectedDisplay = {
  name: string;
  meta: string | null;
  priceLabel: string | null;
};

export function formatProductSelectedDisplay(item: ProductPickerItem): ProductSelectedDisplay {
  const metaParts = [item.spu, item.brandName, item.categoryName].filter(Boolean);
  return {
    name: item.name,
    meta: metaParts.length ? metaParts.join(' · ') : null,
    priceLabel: formatAdminMoney(Number(item.price), item.currencyCode),
  };
}

export function buildProductPickerQueryString(params: ProductPickerListQuery) {
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.brandId) query.set('brand_id', params.brandId);
  if (params.categoryId) query.set('category_id', params.categoryId);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 50) query.set('page_size', String(params.pageSize));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
