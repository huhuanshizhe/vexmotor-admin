import type { ColumnType } from 'antd/es/table';

export const adminTableNowrapHeader = () => ({ style: { whiteSpace: 'nowrap' as const } });

/** 实体类列表（分类、品牌、看板）操作列默认宽度 */
export const ADMIN_TABLE_ENTITY_ACTIONS_WIDTH = 112;

/** 内容类列表（博客、FAQ）操作列默认宽度 */
export const ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH = 140;

export function adminTableScroll(minWidth: number) {
  return { x: minWidth };
}

export function adminTableFixedActionsColumn<T extends object>(
  config: ColumnType<T> & { width?: number },
): ColumnType<T> {
  return {
    ...config,
    fixed: 'right',
    width: config.width ?? ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
    onHeaderCell: config.onHeaderCell ?? adminTableNowrapHeader,
  };
}
