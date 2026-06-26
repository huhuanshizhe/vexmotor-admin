import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';

export const couponStatuses = ['active', 'inactive'] as const;
export type CouponStatus = (typeof couponStatuses)[number];

export const couponScopes = ['all', 'category', 'brand', 'product'] as const;
export type CouponScope = (typeof couponScopes)[number];

export const couponDiscountTypes = ['percent', 'fixed_amount', 'special_price'] as const;
export type CouponDiscountType = (typeof couponDiscountTypes)[number];

export const couponGrantSources = ['admin_send', 'registration', 'self_claim'] as const;
export type CouponGrantSource = (typeof couponGrantSources)[number];

export const couponDistributionTargetModes = ['all_customers', 'selected_customers'] as const;
export type CouponDistributionTargetMode = (typeof couponDistributionTargetModes)[number];

export type CouponLocalePricing = {
  locale: string;
  thresholdAmount: string | null;
  discountValue: string;
  maxDiscountAmount: string | null;
};

export type CouponLocalePricingInput = {
  locale: string;
  thresholdAmount?: number | null;
  discountValue: number;
  maxDiscountAmount?: number | null;
};

export type CouponListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  scope: CouponScope | '';
  discountType: CouponDiscountType | '';
  status: CouponStatus | '';
};

export type CouponGrantListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  source: CouponGrantSource | '';
  batchId: string;
};

export type CouponBatchListQuery = {
  page: number;
  pageSize: AdminListPageSize;
};

export type AdminCouponListItem = {
  id: string;
  name: string;
  couponKey: string;
  scope: CouponScope;
  discountType: CouponDiscountType;
  discountValue: string;
  displayCurrencyCode: string;
  status: CouponStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  totalQuota: number | null;
  issuedQuantity: number;
  perUserLimit: number | null;
  grantOnRegister: boolean;
  stackable: boolean;
  createdAt: Date;
};

export type AdminCouponDetail = Omit<AdminCouponListItem, 'displayCurrencyCode'> & {
  note: string | null;
  localePricing: CouponLocalePricing[];
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
};

export type AdminCouponPayload = {
  name: string;
  couponKey?: string;
  scope: CouponScope;
  stackable?: boolean;
  discountType: CouponDiscountType;
  localePricing: CouponLocalePricingInput[];
  startsAt?: string | null;
  endsAt?: string | null;
  status?: CouponStatus;
  note?: string | null;
  totalQuota?: number | null;
  perUserLimit?: number | null;
  grantOnRegister?: boolean;
  categoryIds?: string[];
  brandIds?: string[];
  productIds?: string[];
};

export type AdminCouponSendPayload = {
  targetMode: CouponDistributionTargetMode;
  userIds?: string[];
  quantityPerUser: number;
  note?: string;
};

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function pick(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const raw = searchParams[key];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
}

export function parseCouponListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): CouponListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const scope = pick(searchParams, 'scope');
  const discountType = pick(searchParams, 'discount_type');
  const status = pick(searchParams, 'status');

  return {
    page: parsePositiveInt(pick(searchParams, 'page'), 1),
    pageSize,
    keyword: pick(searchParams, 'keyword'),
    scope: couponScopes.includes(scope as CouponScope) ? scope as CouponScope : '',
    discountType: couponDiscountTypes.includes(discountType as CouponDiscountType) ? discountType as CouponDiscountType : '',
    status: couponStatuses.includes(status as CouponStatus) ? status as CouponStatus : '',
  };
}

export function buildCouponListQueryString(params: Partial<CouponListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.scope) query.set('scope', params.scope);
  if (params.discountType) query.set('discount_type', params.discountType);
  if (params.status) query.set('status', params.status);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildCouponListUrl(basePath: string, params: Partial<CouponListQuery>) {
  return `${basePath}${buildCouponListQueryString(params)}`;
}

export function getCouponQuotaSummary(item: { totalQuota: number | null; issuedQuantity: number }) {
  if (item.totalQuota == null) {
    return { label: `${item.issuedQuantity}/不限`, remaining: null, exhausted: false };
  }
  const remaining = Math.max(0, item.totalQuota - item.issuedQuantity);
  return {
    label: `${item.issuedQuantity}/${item.totalQuota}`,
    remaining,
    exhausted: remaining <= 0,
  };
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };
