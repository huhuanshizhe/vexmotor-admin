export type ProductCoverageBoard = {
  key: string;
  title: string;
  note: string;
  sourceMode: 'code-seeded' | 'admin-managed';
  enabled?: boolean;
  createdAt?: string;
};

export type ProductBoardConfig = {
  coverageBoards: ProductCoverageBoard[];
};

export type ProductCoverageMetric = {
  key: string;
  title: string;
  count: number;
  sourceMode: 'code-seeded' | 'admin-managed';
  note: string;
  enabled: boolean;
  custom?: boolean;
  createdAt?: string;
};

export type AdminProductBoardsDashboard = {
  coverage: ProductCoverageMetric[];
  summary: {
    boardCount: number;
    customBoardCount: number;
    assignedProductCount: number;
  };
  config: ProductBoardConfig;
};

export const defaultProductBoardConfig: ProductBoardConfig = {
  coverageBoards: [
    {
      key: 'featured',
      title: '特色精选',
      note: '首页/专题位重点展示',
      sourceMode: 'code-seeded',
    },
    {
      key: 'newest',
      title: '最新上架',
      note: '按上新节奏运营',
      sourceMode: 'code-seeded',
    },
    {
      key: 'hot-sale',
      title: '热销',
      note: '销量/转化导向',
      sourceMode: 'code-seeded',
    },
  ],
};

export const SYSTEM_PRODUCT_BOARD_KEY_ORDER = defaultProductBoardConfig.coverageBoards.map((board) => board.key);

const systemBoardOrder = new Map(SYSTEM_PRODUCT_BOARD_KEY_ORDER.map((key, index) => [key, index]));

export function isSystemProductBoardKey(key: string) {
  return systemBoardOrder.has(key);
}

export function sortProductCoverageBoards<T extends { key: string; createdAt?: string | null }>(boards: T[]): T[] {
  return [...boards].sort((left, right) => {
    const leftSystem = systemBoardOrder.get(left.key);
    const rightSystem = systemBoardOrder.get(right.key);
    const leftIsSystem = leftSystem !== undefined;
    const rightIsSystem = rightSystem !== undefined;

    if (leftIsSystem && rightIsSystem) {
      return leftSystem! - rightSystem!;
    }
    if (leftIsSystem) return -1;
    if (rightIsSystem) return 1;

    const leftTime = Date.parse(left.createdAt ?? '');
    const rightTime = Date.parse(right.createdAt ?? '');
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.key.localeCompare(right.key);
  });
}

export function upsertProductCoverageBoard<T extends { key: string }>(
  boards: T[],
  boardKey: string,
  nextBoard: T,
): T[] {
  const index = boards.findIndex((item) => item.key === boardKey);
  if (index < 0) return [...boards, nextBoard];
  return boards.map((item) => (item.key === boardKey ? nextBoard : item));
}
