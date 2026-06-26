import 'server-only';

import { normalizePageSize } from '@/lib/admin-list-query';
import type { ProductPickerItem, ProductPickerListQuery, ProductPickerListResult } from '@/lib/product-picker';
import { getAdminProductListItem, getAdminProductsPaginated } from '@/server/admin/products';

function toPickerItem(item: {
  id: string;
  name: string;
  spu: string;
  coverUrl: string | null;
  brandName: string | null;
  categoryName: string | null;
  price: string;
  currencyCode: string;
  status: 'active' | 'inactive';
}): ProductPickerItem {
  return {
    id: item.id,
    name: item.name,
    spu: item.spu,
    coverUrl: item.coverUrl,
    brandName: item.brandName,
    categoryName: item.categoryName,
    price: item.price,
    currencyCode: item.currencyCode,
    status: item.status,
  };
}

export async function listAdminProductsForPicker(
  query: ProductPickerListQuery = {},
): Promise<ProductPickerListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = normalizePageSize(query.pageSize ?? 50);

  const result = await getAdminProductsPaginated({
    page,
    pageSize,
    keyword: query.keyword?.trim() ?? '',
    brandId: query.brandId ?? '',
    categoryId: query.categoryId ?? '',
    purchaseMode: '',
    paidSample: '',
    status: '',
    lifecycle: '',
    priceMin: '',
    priceMax: '',
    currency: '',
    locale: '',
  });

  return {
    items: result.items.map(toPickerItem),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function lookupAdminProductsForPicker(ids: string[]): Promise<ProductPickerItem[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const rows = await Promise.all(uniqueIds.map((id) => getAdminProductListItem(id)));
  const map = new Map<string, ProductPickerItem>();
  for (const row of rows) {
    if (row) map.set(row.id, toPickerItem(row));
  }
  return uniqueIds.map((id) => map.get(id)).filter((item): item is ProductPickerItem => Boolean(item));
}
