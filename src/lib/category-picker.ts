import type { AdminCategoryTreeNode } from '@/lib/category-content';
import {
  buildCategoryParentTreeSelectData,
  type CategoryParentTreeSelectNode,
} from '@/lib/category-parent-tree-select';

export type CategoryPathInfo = {
  name: string;
  pathLabel: string;
};

export type CategorySelectedDisplay = {
  name: string;
  parentPathLabel: string | null;
};

const CATEGORY_PATH_SEPARATOR = ' / ';

/** 已选分类卡片回显：一级仅主标题；子级上级路径置于主标题上方并以 / 结尾 */
export function formatCategorySelectedDisplay(info: CategoryPathInfo): CategorySelectedDisplay {
  const parts = info.pathLabel.split(CATEGORY_PATH_SEPARATOR);
  if (parts.length <= 1) {
    return { name: info.name, parentPathLabel: null };
  }
  return {
    name: info.name,
    parentPathLabel: `${parts.slice(0, -1).join(CATEGORY_PATH_SEPARATOR)} /`,
  };
}

export type CategoryFlatIndexItem = {
  id: string;
  name: string;
  pathLabel: string;
  parentId: string | null;
};

export function buildCategoryPathMap(tree: AdminCategoryTreeNode[]): Map<string, CategoryPathInfo> {
  const map = new Map<string, CategoryPathInfo>();

  function walk(nodes: AdminCategoryTreeNode[], ancestors: string[]) {
    for (const node of nodes) {
      const pathParts = [...ancestors, node.name];
      map.set(node.id, {
        name: node.name,
        pathLabel: pathParts.join(CATEGORY_PATH_SEPARATOR),
      });
      if (node.children.length) {
        walk(node.children, pathParts);
      }
    }
  }

  walk(tree, []);
  return map;
}

export function buildCategoryFlatIndex(tree: AdminCategoryTreeNode[]): CategoryFlatIndexItem[] {
  const items: CategoryFlatIndexItem[] = [];

  function walk(nodes: AdminCategoryTreeNode[], ancestors: string[]) {
    for (const node of nodes) {
      const pathParts = [...ancestors, node.name];
      items.push({
        id: node.id,
        name: node.name,
        pathLabel: pathParts.join(CATEGORY_PATH_SEPARATOR),
        parentId: node.parentId,
      });
      if (node.children.length) {
        walk(node.children, pathParts);
      }
    }
  }

  walk(tree, []);
  return items;
}

export function filterCategoryFlatIndex(
  items: CategoryFlatIndexItem[],
  keyword: string,
): CategoryFlatIndexItem[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter(
    (item) => item.name.toLowerCase().includes(normalized) || item.pathLabel.toLowerCase().includes(normalized),
  );
}

export function buildCategoryPickerTreeData(
  tree: AdminCategoryTreeNode[],
  disabledIds: ReadonlySet<string>,
): CategoryParentTreeSelectNode[] {
  return buildCategoryParentTreeSelectData(tree, disabledIds);
}

export function getCategoryRootKeys(tree: AdminCategoryTreeNode[]): string[] {
  return tree.map((node) => node.id);
}

export function toCategoryTreeCheckData(
  nodes: CategoryParentTreeSelectNode[],
): Array<{
  key: string;
  title: string;
  disabled?: boolean;
  children?: ReturnType<typeof toCategoryTreeCheckData>;
}> {
  return nodes.map((node) => ({
    key: node.key,
    title: node.title,
    disabled: node.disabled,
    ...(node.children?.length ? { children: toCategoryTreeCheckData(node.children) } : {}),
  }));
}
