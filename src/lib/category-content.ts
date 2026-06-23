export const categoryStatuses = ['active', 'inactive'] as const;

export type CategoryStatus = (typeof categoryStatuses)[number];

export type AdminCategoryPayload = {
  tags: string[];
};

export type AdminCategoryListItem = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: CategoryStatus;
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
  productCount: number;
  hasChildren: boolean;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryTranslation = {
  id: string;
  categoryId: string;
  locale: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  parentId: string | null;
  status: CategoryStatus;
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
  payload: AdminCategoryPayload;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  status: CategoryStatus;
  sortOrder: number;
  productCount: number;
  hasChildren: boolean;
  children: AdminCategoryTreeNode[];
};

export type AdminCategoryTreeSearchMatch = {
  id: string;
  name: string;
  parentId: string | null;
  pathLabel: string;
  sortOrder: number;
  status: CategoryStatus;
  productCount: number;
  hasChildren: boolean;
};

export const ROOT_CATEGORY_PARENT_KEY = '__root__';

export function resolveCategoryId(item: Pick<AdminCategoryTranslation, 'categoryId'>) {
  return item.categoryId;
}

export function getCategoryDeleteBlockReason(
  entry: Pick<AdminCategoryListItem, 'hasChildren' | 'productCount'>,
): string | null {
  if (entry.hasChildren) return '该分类下还有子分类，无法删除';
  if (entry.productCount > 0) return '该分类下还有产品，无法删除';
  return null;
}

export function compareCategoryBySortAndName(
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string },
) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'en');
}
