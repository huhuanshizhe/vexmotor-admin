import 'server-only';

import { ensureProductBoardConfig } from '@/server/admin/product-boards';
import { getProductList } from '@/server/storefront/catalog';
import type { ProductListSort } from '@/server/storefront/types';

export async function resolveStorefrontProductBoard(boardKeyInput: string) {
  const boardKey = boardKeyInput.trim();
  if (!boardKey) return null;

  const config = await ensureProductBoardConfig();
  const board = config.coverageBoards.find((item) => item.key === boardKey);
  if (!board || board.enabled === false) return null;
  return board;
}

export function defaultSortForProductBoard(boardKey: string): ProductListSort {
  if (boardKey === 'newest') return 'newest';
  return 'featured';
}

export async function getProductListByBoard(
  boardKeyInput: string,
  input: {
    page?: number;
    pageSize?: number;
    sort?: ProductListSort;
    purchaseMode?: 'buy' | 'inquiry';
    inStockOnly?: boolean;
    locale?: string | null;
  },
) {
  const board = await resolveStorefrontProductBoard(boardKeyInput);
  if (!board) return null;

  const result = await getProductList({
    productBoardKey: board.key,
    page: input.page,
    pageSize: input.pageSize,
    sort: input.sort ?? defaultSortForProductBoard(board.key),
    purchaseMode: input.purchaseMode,
    inStockOnly: input.inStockOnly,
    locale: input.locale,
  });

  return {
    boardKey: board.key,
    boardTitle: board.title,
    ...result,
  };
}
