import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import type { ProductLifecycleStatus, ProductPurchaseMode, ProductStatus } from '@/lib/product-content';

export type ProductListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  brandId: string;
  categoryId: string;
  boardKey: string;
  purchaseMode: ProductPurchaseMode | '';
  paidSample: '' | 'true' | 'false';
  status: ProductStatus | '';
  lifecycle: ProductLifecycleStatus | '';
  priceMin: string;
  priceMax: string;
  currency: string;
  locale: string;
};

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function parseProductListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): ProductListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const rawPage = searchParams.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;

  const pick = (key: string) => {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
  };

  const purchaseMode = pick('purchase_mode');
  const paidSample = pick('paid_sample');
  const status = pick('status');
  const lifecycle = pick('lifecycle');

  return {
    page: parsePositiveInt(pageValue, 1),
    pageSize,
    keyword: pick('keyword'),
    brandId: pick('brand_id'),
    categoryId: pick('category_id'),
    boardKey: pick('board_key'),
    purchaseMode: purchaseMode === 'buy' || purchaseMode === 'inquiry' ? purchaseMode : '',
    paidSample: paidSample === 'true' || paidSample === 'false' ? paidSample : '',
    status: status === 'active' || status === 'inactive' ? status : '',
    lifecycle: (['new', 'active', 'nfd', 'eol', 'last_time_buy'] as const).includes(lifecycle as ProductLifecycleStatus)
      ? lifecycle as ProductLifecycleStatus
      : '',
    priceMin: pick('price_min'),
    priceMax: pick('price_max'),
    currency: pick('currency').toUpperCase(),
    locale: pick('locale'),
  };
}

export function buildProductListQueryString(params: Partial<ProductListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.brandId) query.set('brand_id', params.brandId);
  if (params.categoryId) query.set('category_id', params.categoryId);
  if (params.boardKey) query.set('board_key', params.boardKey);
  if (params.purchaseMode) query.set('purchase_mode', params.purchaseMode);
  if (params.paidSample) query.set('paid_sample', params.paidSample);
  if (params.status) query.set('status', params.status);
  if (params.lifecycle) query.set('lifecycle', params.lifecycle);
  if (params.priceMin) query.set('price_min', params.priceMin);
  if (params.priceMax) query.set('price_max', params.priceMax);
  if (params.currency) query.set('currency', params.currency);
  if (params.locale) query.set('locale', params.locale);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildProductListUrl(basePath: string, params: Partial<ProductListQuery>) {
  return `${basePath}${buildProductListQueryString(params)}`;
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };
