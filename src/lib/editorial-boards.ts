import { defaultEditorialAutomationConfig } from '@/lib/editorial-automation';

/** 系统内置看板的固定顺序（与 defaultEditorialAutomationConfig.coverageBoards 一致） */
export const SYSTEM_BOARD_KEY_ORDER = defaultEditorialAutomationConfig.coverageBoards.map((board) => board.key);

const systemBoardOrder = new Map(SYSTEM_BOARD_KEY_ORDER.map((key, index) => [key, index]));

export function isSystemBoardKey(key: string) {
  return systemBoardOrder.has(key);
}

export function sortCoverageBoards<T extends { key: string; createdAt?: string | null }>(boards: T[]): T[] {
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

export function upsertCoverageBoard<T extends { key: string }>(
  boards: T[],
  boardKey: string,
  nextBoard: T,
): T[] {
  const index = boards.findIndex((item) => item.key === boardKey);
  if (index < 0) return [...boards, nextBoard];
  return boards.map((item) => (item.key === boardKey ? nextBoard : item));
}
