import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';
import type { OrderListView } from '@/lib/order-status';

export type OrderPendingListQuery = {
  keyword: string;
};

export type OrderHistoryListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
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

export function parseOrderPendingListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): OrderPendingListQuery {
  return {
    keyword: pick(searchParams, 'keyword'),
  };
}

export function parseOrderHistoryListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): OrderHistoryListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const rawPage = searchParams.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;

  return {
    page: parsePositiveInt(pageValue, 1),
    pageSize,
    keyword: pick(searchParams, 'keyword'),
  };
}

export function buildOrderPendingListQueryString(params: Partial<OrderPendingListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildOrderHistoryListQueryString(params: Partial<OrderHistoryListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildOrderPendingListUrl(basePath: string, params: Partial<OrderPendingListQuery>) {
  return `${basePath}${buildOrderPendingListQueryString(params)}`;
}

export function buildOrderHistoryListUrl(basePath: string, params: Partial<OrderHistoryListQuery>) {
  return `${basePath}${buildOrderHistoryListQueryString(params)}`;
}

export type OrderDetailFrom = OrderListView;

const listViewPaths: Record<OrderListView, string> = {
  pending: '/admin/orders',
  processed: '/admin/orders/processed',
  refunds: '/admin/orders/refunds',
  history: '/admin/orders/history',
};

const listViewBackLabels: Record<OrderListView, string> = {
  pending: '返回待处理订单',
  processed: '返回已处理订单',
  refunds: '返回退款订单',
  history: '返回历史订单',
};

function appendListQueryParams(target: URLSearchParams, serialized: string) {
  if (!serialized) return;
  const source = new URLSearchParams(serialized.startsWith('?') ? serialized.slice(1) : serialized);
  source.forEach((value, key) => {
    if (key !== 'from') target.set(key, value);
  });
}

export function buildOrderDetailUrl(
  orderNumber: string,
  from: OrderDetailFrom,
  listQuery?: Partial<OrderPendingListQuery> | Partial<OrderHistoryListQuery>,
) {
  const params = new URLSearchParams();
  params.set('from', from);

  if (from === 'pending') {
    appendListQueryParams(params, buildOrderPendingListQueryString(listQuery as Partial<OrderPendingListQuery>));
  } else {
    appendListQueryParams(params, buildOrderHistoryListQueryString(listQuery as Partial<OrderHistoryListQuery>));
  }

  const serialized = params.toString();
  return `/admin/orders/${orderNumber}${serialized ? `?${serialized}` : ''}`;
}

export function resolveOrderDetailBack(searchParams: Record<string, string | string[] | undefined>) {
  const from = pick(searchParams, 'from');
  const resolvedFrom: OrderDetailFrom =
    from === 'processed' || from === 'refunds' || from === 'history' || from === 'pending' ? from : 'pending';

  if (resolvedFrom === 'pending') {
    return {
      href: buildOrderPendingListUrl(listViewPaths.pending, parseOrderPendingListQuery(searchParams)),
      label: listViewBackLabels.pending,
    };
  }

  return {
    href: buildOrderHistoryListUrl(listViewPaths[resolvedFrom], parseOrderHistoryListQuery(searchParams)),
    label: listViewBackLabels[resolvedFrom],
  };
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };
