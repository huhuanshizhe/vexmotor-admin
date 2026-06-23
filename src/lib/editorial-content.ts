export const editorialEntryStatuses = ['draft', 'published', 'archived'] as const;

export type EditorialEntryStatus = (typeof editorialEntryStatuses)[number];

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
