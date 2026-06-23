import type { Key } from 'react';

import type { CategoryTreeDataNode } from '@/components/categories/category-tree-panel';

export const CATEGORY_TREE_INDENT_PX = 12;
/** 行顶/底用于「拖出/排序」的扩展热区（像素） */
const SIBLING_EDGE_BAND_MIN_PX = 12;
/** 行顶/底用于「拖出/排序」的扩展热区（占行高比例） */
const SIBLING_EDGE_BAND_RATIO = 0.3;
/** 两行之间额外扩大的排序热区 */
const INTER_ROW_GAP_EXPAND_PX = 14;

export type CategoryTreeDropMode = 'child' | 'sibling';

export type CategoryTreeGapMarker = {
  anchorKey: string;
  position: 'before' | 'after';
};

export type CategoryTreeDropIntent = {
  mode: CategoryTreeDropMode;
  childTargetKey: string | null;
  gapMarker: CategoryTreeGapMarker | null;
  targetParentKey: string | null;
  insertIndex: number;
};

type ResolveCategoryTreeDropInput = {
  panel: HTMLElement;
  treeData: CategoryTreeDataNode[];
  dragKey: Key;
  clientX: number;
  clientY: number;
  /** 用于横向层级：被拖名称左边缘的当前 X（非鼠标指针） */
  levelClientX: number;
};

export type CategoryTreeDragLevelAnchor = {
  startClientX: number;
  startNameLeft: number;
};

/** 根据拖拽起点记录，推算被拖名称左边缘的当前 X */
export function resolveDragLevelClientX(
  anchor: CategoryTreeDragLevelAnchor,
  clientX: number,
): number {
  return anchor.startNameLeft + (clientX - anchor.startClientX);
}

export function measureDragNameLeft(panel: HTMLElement, dragKey: Key): number | null {
  const nameEl = panel.querySelector<HTMLElement>(
    `[data-category-id="${String(dragKey)}"] .category-tree-title__name`,
  );
  return nameEl?.getBoundingClientRect().left ?? null;
}

type RowHit = {
  key: string;
  treenode: HTMLElement;
  nameEl: HTMLElement | null;
};

function findNodePath(
  nodes: CategoryTreeDataNode[],
  key: Key,
  trail: CategoryTreeDataNode[] = [],
): CategoryTreeDataNode[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.key === key) return nextTrail;
    if (node.children?.length) {
      const nested = findNodePath(node.children, key, nextTrail);
      if (nested) return nested;
    }
  }
  return null;
}

function collectDescendantKeys(key: Key, nodes: CategoryTreeDataNode[]): Set<string> {
  const result = new Set<string>();
  const walk = (node: CategoryTreeDataNode) => {
    result.add(node.key);
    for (const child of node.children ?? []) walk(child);
  };

  const find = (items: CategoryTreeDataNode[]): boolean => {
    for (const node of items) {
      if (node.key === key) {
        walk(node);
        return true;
      }
      if (node.children?.length && find(node.children)) return true;
    }
    return false;
  };

  find(nodes);
  result.delete(String(key));
  return result;
}

function getSiblings(
  nodes: CategoryTreeDataNode[],
  parentKey: string | null,
): CategoryTreeDataNode[] {
  if (parentKey === null) return nodes;
  const path = findNodePath(nodes, parentKey);
  if (!path?.length) return [];
  return path[path.length - 1].children ?? [];
}

function measureBaseNameLeft(panel: HTMLElement): number {
  const firstName = panel.querySelector<HTMLElement>(
    '.ant-tree-list .ant-tree-treenode .category-tree-title__name',
  );
  return firstName?.getBoundingClientRect().left
    ?? panel.querySelector('.ant-tree-list')?.getBoundingClientRect().left
    ?? panel.getBoundingClientRect().left;
}

function measureIndentStep(panel: HTMLElement): number {
  const unit = panel.querySelector<HTMLElement>('.ant-tree-indent-unit');
  const width = unit?.getBoundingClientRect().width;
  return width && width > 0 ? width : CATEGORY_TREE_INDENT_PX;
}

function resolveTargetLevel(clientX: number, baseLeft: number, indentStep: number): number {
  const offset = clientX - baseLeft + indentStep / 2;
  if (offset < 0) return 0;
  return Math.floor(offset / indentStep);
}

function getSiblingEdgeBand(rowHeight: number): number {
  return Math.max(SIBLING_EDGE_BAND_MIN_PX, rowHeight * SIBLING_EDGE_BAND_RATIO);
}

function rowHitFromTreenode(treenode: HTMLElement): RowHit | null {
  const titleRoot = treenode.querySelector<HTMLElement>('[data-category-id]');
  const key = titleRoot?.dataset.categoryId;
  if (!key) return null;
  return {
    key,
    treenode,
    nameEl: treenode.querySelector<HTMLElement>('.category-tree-title__name'),
  };
}

function findTreenodeByExpandedY(panel: HTMLElement, clientY: number): RowHit | null {
  const rows = [...panel.querySelectorAll<HTMLElement>('.ant-tree-treenode')];
  if (!rows.length) return null;

  let bestRow: HTMLElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rect = row.getBoundingClientRect();
    const prevBottom = index > 0 ? rows[index - 1].getBoundingClientRect().bottom : rect.top;
    const nextTop = index < rows.length - 1 ? rows[index + 1].getBoundingClientRect().top : rect.bottom;
    const zoneTop = index === 0
      ? rect.top - INTER_ROW_GAP_EXPAND_PX
      : (prevBottom + rect.top) / 2 - INTER_ROW_GAP_EXPAND_PX;
    const zoneBottom = index === rows.length - 1
      ? rect.bottom + INTER_ROW_GAP_EXPAND_PX
      : (rect.bottom + nextTop) / 2 + INTER_ROW_GAP_EXPAND_PX;

    if (clientY < zoneTop || clientY > zoneBottom) continue;

    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(clientY - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRow = row;
    }
  }

  return bestRow ? rowHitFromTreenode(bestRow) : null;
}

function findTreenodeAtPoint(panel: HTMLElement, clientX: number, clientY: number): RowHit | null {
  const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const treenode = hit?.closest<HTMLElement>('.ant-tree-treenode');
  if (treenode && panel.contains(treenode)) {
    const rowHit = rowHitFromTreenode(treenode);
    if (rowHit) return rowHit;
  }
  return findTreenodeByExpandedY(panel, clientY);
}

function isPointOnName(
  clientX: number,
  clientY: number,
  nameEl: HTMLElement | null,
): boolean {
  if (!nameEl) return false;
  const rect = nameEl.getBoundingClientRect();
  return clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
}

function resolveDropMode(clientX: number, clientY: number, hit: RowHit): CategoryTreeDropMode {
  const rowRect = hit.treenode.getBoundingClientRect();
  const edgeBand = getSiblingEdgeBand(rowRect.height);
  const relativeY = clientY - rowRect.top;

  if (relativeY < edgeBand || relativeY > rowRect.height - edgeBand) {
    return 'sibling';
  }
  if (isPointOnName(clientX, clientY, hit.nameEl)) {
    return 'child';
  }
  return 'sibling';
}

function computeInsertIndex(
  panel: HTMLElement,
  siblings: CategoryTreeDataNode[],
  dragKey: Key,
  clientY: number,
): number {
  const candidates = siblings.filter((item) => item.key !== dragKey);
  for (let index = 0; index < candidates.length; index += 1) {
    const titleRoot = panel.querySelector<HTMLElement>(`[data-category-id="${candidates[index].key}"]`);
    const row = titleRoot?.closest<HTMLElement>('.ant-tree-treenode');
    if (!row) continue;

    const rect = row.getBoundingClientRect();
    let boundaryY = rect.top;
    if (index > 0) {
      const prevRoot = panel.querySelector<HTMLElement>(`[data-category-id="${candidates[index - 1].key}"]`);
      const prevRow = prevRoot?.closest<HTMLElement>('.ant-tree-treenode');
      if (prevRow) {
        const prevRect = prevRow.getBoundingClientRect();
        boundaryY = (prevRect.bottom + rect.top) / 2;
      }
    }
    if (clientY < boundaryY) return index;
  }
  return candidates.length;
}

/** 同一插入位置只渲染一条定位线（统一用 before，末尾用 after） */
function resolveGapMarkerFromInsertIndex(
  siblings: CategoryTreeDataNode[],
  dragKey: Key,
  insertIndex: number,
): CategoryTreeGapMarker | null {
  const candidates = siblings.filter((item) => item.key !== dragKey);
  if (!candidates.length) return null;

  const boundedIndex = Math.max(0, Math.min(insertIndex, candidates.length));
  if (boundedIndex < candidates.length) {
    return { anchorKey: candidates[boundedIndex].key, position: 'before' };
  }
  return { anchorKey: candidates[candidates.length - 1].key, position: 'after' };
}

export function resolveCategoryTreeDrop({
  panel,
  treeData,
  dragKey,
  clientX,
  clientY,
  levelClientX,
}: ResolveCategoryTreeDropInput): CategoryTreeDropIntent | null {
  const hit = findTreenodeAtPoint(panel, clientX, clientY);
  if (!hit) return null;

  const descendants = collectDescendantKeys(dragKey, treeData);
  if (descendants.has(hit.key)) return null;

  let mode = resolveDropMode(clientX, clientY, hit);
  if (hit.key === String(dragKey)) {
    mode = 'sibling';
  }

  if (mode === 'child') {
    return {
      mode: 'child',
      childTargetKey: hit.key,
      gapMarker: null,
      targetParentKey: hit.key,
      insertIndex: 0,
    };
  }

  const path = findNodePath(treeData, hit.key);
  if (!path?.length) return null;

  const baseLeft = measureBaseNameLeft(panel);
  const indentStep = measureIndentStep(panel);
  const targetLevel = resolveTargetLevel(levelClientX, baseLeft, indentStep);
  const targetParentKey = targetLevel === 0
    ? null
    : path[Math.min(targetLevel - 1, path.length - 1)].key;
  const siblings = getSiblings(treeData, targetParentKey);
  const insertIndex = computeInsertIndex(panel, siblings, dragKey, clientY);
  const gapMarker = resolveGapMarkerFromInsertIndex(siblings, dragKey, insertIndex);

  return {
    mode: 'sibling',
    childTargetKey: null,
    gapMarker,
    targetParentKey,
    insertIndex,
  };
}

export function applyCategoryTreeDropIntent(
  nodes: CategoryTreeDataNode[],
  dragKey: Key,
  intent: CategoryTreeDropIntent,
): { data: CategoryTreeDataNode[]; parentId: string | null } | null {
  const data = structuredClone(nodes);
  let dragNode: CategoryTreeDataNode | undefined;

  const removeDragNode = (items: CategoryTreeDataNode[]): boolean => {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.key === dragKey) {
        dragNode = item;
        items.splice(index, 1);
        return true;
      }
      if (item.children?.length && removeDragNode(item.children)) return true;
    }
    return false;
  };

  if (!removeDragNode(data) || !dragNode) return null;

  if (intent.mode === 'child') {
    const insert = (items: CategoryTreeDataNode[]): boolean => {
      for (const item of items) {
        if (item.key !== intent.targetParentKey) {
          if (item.children?.length && insert(item.children)) return true;
          continue;
        }
        item.children = item.children ?? [];
        item.children.push(dragNode!);
        return true;
      }
      return false;
    };
    if (!insert(data)) return null;
    return { data, parentId: intent.targetParentKey };
  }

  const siblings = getSiblings(data, intent.targetParentKey);
  const filtered = siblings.filter((item) => item.key !== dragKey);
  const boundedIndex = Math.max(0, Math.min(intent.insertIndex, filtered.length));
  filtered.splice(boundedIndex, 0, dragNode);

  if (intent.targetParentKey === null) {
    return { data: filtered, parentId: null };
  }

  const assignChildren = (items: CategoryTreeDataNode[]): boolean => {
    for (const item of items) {
      if (item.key === intent.targetParentKey) {
        item.children = filtered;
        return true;
      }
      if (item.children?.length && assignChildren(item.children)) return true;
    }
    return false;
  };

  if (!assignChildren(data)) return null;
  return { data, parentId: intent.targetParentKey };
}
