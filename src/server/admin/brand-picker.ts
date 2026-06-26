import 'server-only';

import { normalizePageSize } from '@/lib/admin-list-query';
import type { BrandPickerItem, BrandPickerListQuery, BrandPickerListResult } from '@/lib/brand-picker';
import { getAdminBrandListItem, getAdminBrandsPaginated } from '@/server/admin/brands';

function toPickerItem(item: {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
}): BrandPickerItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    logoUrl: item.logoUrl,
    productCount: item.productCount,
  };
}

export async function listAdminBrandsForPicker(
  query: BrandPickerListQuery = {},
): Promise<BrandPickerListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = normalizePageSize(query.pageSize ?? 50);
  const result = await getAdminBrandsPaginated({
    keyword: query.keyword,
    page,
    pageSize,
  });

  return {
    items: result.items.map(toPickerItem),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function lookupAdminBrandsForPicker(ids: string[]): Promise<BrandPickerItem[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const rows = await Promise.all(uniqueIds.map((id) => getAdminBrandListItem(id)));
  const map = new Map<string, BrandPickerItem>();
  for (const row of rows) {
    if (row) map.set(row.id, toPickerItem(row));
  }
  return uniqueIds.map((id) => map.get(id)).filter((item): item is BrandPickerItem => Boolean(item));
}
