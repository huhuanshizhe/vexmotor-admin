import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import type { InquiryStatus } from '@/server/storefront/inquiries';

export type InquiryQueueKind = 'new_inquiry' | 'customer_replied';

export type InquiryResolutionFilter = '' | 'resolved' | 'terminated' | 'replied';

export type InquiryActiveListQuery = {
  keyword: string;
  queueKind: InquiryQueueKind | '';
  status: InquiryStatus | '';
};

export type InquiryHistoryListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  status: InquiryStatus | '';
  resolution: InquiryResolutionFilter;
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

export function parseInquiryActiveListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): InquiryActiveListQuery {
  const queueKind = pick(searchParams, 'queue_kind');
  const status = pick(searchParams, 'status');

  return {
    keyword: pick(searchParams, 'keyword'),
    queueKind: queueKind === 'new_inquiry' || queueKind === 'customer_replied' ? queueKind : '',
    status: status === 'new' || status === 'contacted' || status === 'quoted' || status === 'closed' ? status : '',
  };
}

export function parseInquiryHistoryListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): InquiryHistoryListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const rawPage = searchParams.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const status = pick(searchParams, 'status');
  const resolution = pick(searchParams, 'resolution');

  return {
    page: parsePositiveInt(pageValue, 1),
    pageSize,
    keyword: pick(searchParams, 'keyword'),
    status: status === 'new' || status === 'contacted' || status === 'quoted' || status === 'closed' ? status : '',
    resolution: resolution === 'resolved' || resolution === 'terminated' || resolution === 'replied' ? resolution : '',
  };
}

export function buildInquiryActiveListQueryString(params: Partial<InquiryActiveListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.queueKind) query.set('queue_kind', params.queueKind);
  if (params.status) query.set('status', params.status);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildInquiryHistoryListQueryString(params: Partial<InquiryHistoryListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.resolution) query.set('resolution', params.resolution);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildInquiryActiveListUrl(basePath: string, params: Partial<InquiryActiveListQuery>) {
  return `${basePath}${buildInquiryActiveListQueryString(params)}`;
}

export function buildInquiryHistoryListUrl(basePath: string, params: Partial<InquiryHistoryListQuery>) {
  return `${basePath}${buildInquiryHistoryListQueryString(params)}`;
}

export type InquiryDetailFrom = 'active' | 'history';

function appendListQueryParams(target: URLSearchParams, serialized: string) {
  if (!serialized) return;
  const source = new URLSearchParams(serialized.startsWith('?') ? serialized.slice(1) : serialized);
  source.forEach((value, key) => {
    if (key !== 'from') target.set(key, value);
  });
}

export function buildInquiryDetailUrl(
  id: string,
  from: InquiryDetailFrom,
  listQuery?: Partial<InquiryActiveListQuery> | Partial<InquiryHistoryListQuery>,
) {
  const params = new URLSearchParams();
  params.set('from', from);

  if (from === 'active') {
    appendListQueryParams(params, buildInquiryActiveListQueryString(listQuery as Partial<InquiryActiveListQuery>));
  } else {
    appendListQueryParams(params, buildInquiryHistoryListQueryString(listQuery as Partial<InquiryHistoryListQuery>));
  }

  const serialized = params.toString();
  return `/admin/inquiries/${id}${serialized ? `?${serialized}` : ''}`;
}

export function resolveInquiryDetailBack(
  searchParams: Record<string, string | string[] | undefined>,
  fallback?: { awaitingAdmin?: boolean },
) {
  const from = pick(searchParams, 'from');
  const resolvedFrom: InquiryDetailFrom = from === 'history'
    ? 'history'
    : from === 'active'
      ? 'active'
      : fallback?.awaitingAdmin === false
        ? 'history'
        : 'active';

  if (resolvedFrom === 'history') {
    return {
      href: buildInquiryHistoryListUrl('/admin/inquiries/history', parseInquiryHistoryListQuery(searchParams)),
      label: '返回历史询盘',
    };
  }

  return {
    href: buildInquiryActiveListUrl('/admin/inquiries', parseInquiryActiveListQuery(searchParams)),
    label: '返回待处理',
  };
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };
