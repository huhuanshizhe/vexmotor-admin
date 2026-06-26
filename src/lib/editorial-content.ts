export const editorialEntryStatuses = ['draft', 'published', 'archived'] as const;

export type EditorialEntryStatus = (typeof editorialEntryStatuses)[number];

export const editorialContentModules = ['editorial', 'faq'] as const;
export type EditorialContentModule = (typeof editorialContentModules)[number];

import { normalizeEntityKeyForSave } from '@/lib/admin-entity-key';

export const FAQ_BOARD_KEYS = ['faq', 'tech-faq'] as const;

export function normalizeBoardKeyForModule(value: string | null | undefined) {
  return normalizeEntityKeyForSave(value ?? '') ?? 'content';
}

export function resolveContentModuleByBoard(boardKey: string): EditorialContentModule {
  const normalized = normalizeBoardKeyForModule(boardKey);
  return (FAQ_BOARD_KEYS as readonly string[]).includes(normalized) ? 'faq' : 'editorial';
}

export function isFaqBoardKey(boardKey: string) {
  return resolveContentModuleByBoard(boardKey) === 'faq';
}

export function filterCoverageByModule<T extends { key: string }>(
  boards: T[],
  contentModule: EditorialContentModule,
): T[] {
  return boards.filter((board) => resolveContentModuleByBoard(board.key) === contentModule);
}

export type EditorialContentPayload = {
  body: string;
  coverUrl: string | null;
  coverAlt: string | null;
  tags: string[];
  relatedProductSlugs: string[];
};

/** 列表行：一条内容对应一行，不展开多语言 */
export type AdminEditorialContentListItem = {
  id: string;
  contentType: 'content';
  boardKey: string;
  boardKeys: string[];
  status: EditorialEntryStatus;
  title: string;
  slug: string;
  summary: string | null;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 单语言翻译（编辑弹窗 / 分组 API） */
export type AdminEditorialContentTranslation = {
  id: string;
  contentId: string;
  contentType: 'content';
  boardKey: string;
  boardKeys: string[];
  locale: string;
  title: string;
  slug: string;
  summary: string | null;
  status: EditorialEntryStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  payload: EditorialContentPayload;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated 使用 AdminEditorialContentListItem（列表）或 AdminEditorialContentTranslation（编辑） */
export type AdminEditorialContentEntry = AdminEditorialContentTranslation;

export const defaultEditorialContentBody = '<p></p>';

export function resolveContentId(item: Pick<AdminEditorialContentTranslation, 'contentId'>) {
  return item.contentId;
}

/** @deprecated 使用 resolveContentId */
export function resolveTranslationGroupId(entry: Pick<AdminEditorialContentTranslation, 'contentId' | 'id'> & { translationGroupId?: string }) {
  return entry.contentId || entry.translationGroupId || entry.id;
}
