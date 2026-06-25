import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';

export type CustomerListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  status: 'active' | 'disabled' | 'pending' | '';
  role: 'customer' | 'staff' | 'admin' | '';
  industry: string;
  country: string;
};

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function parseCustomerListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): CustomerListQuery {
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

  const status = pick('status');
  const role = pick('role');

  return {
    page: parsePositiveInt(pageValue, 1),
    pageSize,
    keyword: pick('keyword'),
    status: status === 'active' || status === 'disabled' || status === 'pending' ? status : '',
    role: role === 'customer' || role === 'staff' || role === 'admin' ? role : '',
    industry: pick('industry'),
    country: pick('country').toUpperCase(),
  };
}

export function buildCustomerListQueryString(params: Partial<CustomerListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.role) query.set('role', params.role);
  if (params.industry) query.set('industry', params.industry);
  if (params.country) query.set('country', params.country);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildCustomerListUrl(basePath: string, params: Partial<CustomerListQuery>) {
  return `${basePath}${buildCustomerListQueryString(params)}`;
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };
