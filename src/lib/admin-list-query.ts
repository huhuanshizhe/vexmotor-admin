export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const ADMIN_LIST_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_LIST_PAGE_SIZE_STORAGE_KEY = 'vexmotor-admin-list-page-size';
export const UNASSIGNED_BOARD_KEY = '__unassigned__';

export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZE_OPTIONS)[number];


export type AdminListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  board: string;
  parentId: string;
};

export type AdminEditorialListResult = {
  items: import('@/lib/editorial-content').AdminEditorialContentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function normalizePageSize(value: string | number | null | undefined, fallback = ADMIN_LIST_DEFAULT_PAGE_SIZE): AdminListPageSize {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (ADMIN_LIST_PAGE_SIZE_OPTIONS.includes(parsed as AdminListPageSize)) {
    return parsed as AdminListPageSize;
  }
  return ADMIN_LIST_PAGE_SIZE_OPTIONS.includes(fallback as AdminListPageSize)
    ? fallback as AdminListPageSize
    : ADMIN_LIST_DEFAULT_PAGE_SIZE;
}

export function readStoredPageSize(): AdminListPageSize | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ADMIN_LIST_PAGE_SIZE_STORAGE_KEY);
    return stored ? normalizePageSize(stored) : null;
  } catch {
    return null;
  }
}

export function writeStoredPageSize(pageSize: AdminListPageSize) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADMIN_LIST_PAGE_SIZE_STORAGE_KEY, String(pageSize));
  } catch {
    // ignore quota errors
  }
}

export function parseAdminListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { defaultBoard?: string; storedPageSize?: AdminListPageSize | null },
): AdminListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const rawPage = searchParams.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = parsePositiveInt(pageValue, 1);

  const rawKeyword = searchParams.keyword;
  const keyword = (Array.isArray(rawKeyword) ? rawKeyword[0] : rawKeyword)?.trim() ?? '';

  const rawBoard = searchParams.board;
  const board = (Array.isArray(rawBoard) ? rawBoard[0] : rawBoard)?.trim()
    || options?.defaultBoard
    || '';

  const rawParentId = searchParams.parent_id;
  const parentId = (Array.isArray(rawParentId) ? rawParentId[0] : rawParentId)?.trim() ?? '';

  return { page, pageSize, keyword, board, parentId };
}

export function buildAdminListQueryString(params: Partial<AdminListQuery>) {
  const query = new URLSearchParams();
  if (params.board) query.set('board', params.board);
  if (params.parentId) query.set('parent_id', params.parentId);
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildAdminListUrl(basePath: string, params: Partial<AdminListQuery>) {
  return `${basePath}${buildAdminListQueryString(params)}`;
}

export function getTotalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(total, 0) / Math.max(pageSize, 1)));
}

export function getAdminListRowIndex(page: number, pageSize: number, index: number) {
  return (page - 1) * pageSize + index + 1;
}

export function buildAdminListRowIndexColumn(page: number, pageSize: number) {
  return {
    title: '序号',
    key: '__rowIndex',
    width: 64,
    align: 'center' as const,
    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
    render: (_: unknown, __: unknown, index: number) => getAdminListRowIndex(page, pageSize, index),
  };
}
