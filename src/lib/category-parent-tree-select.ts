import { type AdminCategoryTreeNode, compareCategoryBySortAndName } from '@/lib/category-content';

export type CategoryParentTreeSelectNode = {
  value: string;
  title: string;
  label: string;
  key: string;
  disabled?: boolean;
  children?: CategoryParentTreeSelectNode[];
};

export function buildCategoryParentTreeSelectData(
  nodes: AdminCategoryTreeNode[],
  disabledIds: ReadonlySet<string>,
): CategoryParentTreeSelectNode[] {
  return [...nodes].sort(compareCategoryBySortAndName).map((node) => {
    const children = node.children.length
      ? buildCategoryParentTreeSelectData(node.children, disabledIds)
      : undefined;

    return {
      value: node.id,
      title: node.name,
      label: node.name,
      key: node.id,
      disabled: disabledIds.has(node.id),
      ...(children?.length ? { children } : {}),
    };
  });
}
