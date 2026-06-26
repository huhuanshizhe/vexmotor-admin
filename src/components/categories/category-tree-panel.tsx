'use client';

import {
  MoreOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Input, Tooltip, Tree, message } from 'antd';
import type { TreeProps } from 'antd/es/tree';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Key,
} from 'react';

import { buildAdminEntityActionMenuItems } from '@/components/admin/admin-row-actions';

import {
  ROOT_CATEGORY_PARENT_KEY,
  type AdminCategoryTreeNode,
  type AdminCategoryTreeSearchMatch,
  type CategoryStatus,
  getCategoryDeleteBlockReason,
} from '@/lib/category-content';
import {
  applyCategoryTreeDropIntent,
  measureDragNameLeft,
  resolveCategoryTreeDrop,
  resolveDragLevelClientX,
  type CategoryTreeDragLevelAnchor,
  type CategoryTreeDropIntent,
  type CategoryTreeGapMarker,
} from '@/lib/category-tree-drag';

const TREE_HEIGHT = 480;
const TREE_SEARCH_DEBOUNCE_MS = 400;
const TREE_NAME_TOOLTIP_DELAY_MS = 3000;

export type CategoryTreeDataNode = {
  key: string;
  /** 留空，避免 rc-tree 在整行节点上设置原生 title 属性 */
  title: '';
  name: string;
  tooltipTitle: string;
  isLeaf?: boolean;
  children?: CategoryTreeDataNode[];
  categoryStatus: CategoryStatus;
  productCount: number;
  hasChildCategories: boolean;
  parentId: string | null;
  sortOrder: number;
};

type CategoryTreePanelProps = {
  roots: AdminCategoryTreeNode[];
  rootsVersion: number;
  selectedId: string;
  pendingNodeId?: string | null;
  onSelect: (id: string, name: string) => void;
  onReload: () => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleStatus: (nodeId: string, status: CategoryStatus) => void;
};

function blockTreePointerEvent(event: React.MouseEvent | React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function stopTreeClickBubble(event: React.MouseEvent) {
  event.stopPropagation();
}

function toTreeData(nodes: AdminCategoryTreeNode[]): CategoryTreeDataNode[] {
  return nodes.map((node) => {
    const children = node.children.length ? toTreeData(node.children) : undefined;
    return {
      key: node.id,
      title: '',
      name: node.name,
      tooltipTitle: node.name,
      isLeaf: !node.hasChildren,
      categoryStatus: node.status,
      productCount: node.productCount,
      hasChildCategories: node.hasChildren,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      ...(children ? { children } : {}),
    };
  });
}

function toSearchNodes(matches: AdminCategoryTreeSearchMatch[]): CategoryTreeDataNode[] {
  return matches.map((match) => ({
    key: match.id,
    title: '',
    name: match.name,
    tooltipTitle: match.pathLabel,
    isLeaf: true,
    categoryStatus: match.status,
    productCount: match.productCount,
    hasChildCategories: match.hasChildren,
    parentId: match.parentId,
    sortOrder: match.sortOrder,
  }));
}

function syncBranchMeta(nodes: CategoryTreeDataNode[]) {
  for (const node of nodes) {
    if (node.children?.length) {
      syncBranchMeta(node.children);
      node.hasChildCategories = true;
      node.isLeaf = false;
      continue;
    }
    delete node.children;
    node.hasChildCategories = false;
    node.isLeaf = true;
  }
}

function loopTree(
  nodes: CategoryTreeDataNode[],
  key: Key,
  callback: (item: CategoryTreeDataNode, index: number, arr: CategoryTreeDataNode[]) => void,
): boolean {
  for (let index = 0; index < nodes.length; index += 1) {
    const item = nodes[index];
    if (item.key === key) {
      callback(item, index, nodes);
      return true;
    }
    if (item.children?.length && loopTree(item.children, key, callback)) {
      return true;
    }
  }
  return false;
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

function collectMovesFromTree(nodes: CategoryTreeDataNode[], parentId: string | null = null) {
  const moves: Array<{ id: string; parentId: string | null; sortOrder: number }> = [];
  const walk = (items: CategoryTreeDataNode[], currentParentId: string | null) => {
    items.forEach((item, index) => {
      moves.push({ id: item.key, parentId: currentParentId, sortOrder: index });
      if (item.children?.length) walk(item.children, item.key);
    });
  };
  walk(nodes, parentId);
  return moves;
}

type CategoryTreeNameProps = {
  title: string;
  tooltipTitle: string;
  isDragging: boolean;
};

const CategoryTreeName = memo(function CategoryTreeName({
  title,
  tooltipTitle,
  isDragging,
}: CategoryTreeNameProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const checkTruncated = useCallback(() => {
    const element = textRef.current;
    if (!element) return false;
    return element.scrollWidth > element.clientWidth;
  }, []);

  useLayoutEffect(() => {
    checkTruncated();
  }, [title, checkTruncated]);

  useEffect(() => {
    const element = textRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      checkTruncated();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [checkTruncated, title]);

  useEffect(() => {
    if (isDragging) {
      clearShowTimer();
      setTooltipOpen(false);
    }
  }, [clearShowTimer, isDragging]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  const handleMouseEnter = () => {
    if (isDragging) return;
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      if (!checkTruncated()) return;
      setTooltipOpen(true);
    }, TREE_NAME_TOOLTIP_DELAY_MS);
  };

  const handleMouseLeave = () => {
    clearShowTimer();
    setTooltipOpen(false);
  };

  return (
    <Tooltip
      open={tooltipOpen}
      title={tooltipTitle}
      trigger={[]}
      getPopupContainer={() => document.body}
    >
      <span
        ref={textRef}
        className="category-tree-title__name category-tree-title__name-ellipsis"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {title}
      </span>
    </Tooltip>
  );
});

type CategoryTreeTitleProps = {
  node: CategoryTreeDataNode;
  isActionPending: boolean;
  isDragging: boolean;
  isDropChildTarget: boolean;
  onSelectNode: (nodeId: string, name: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (node: CategoryTreeDataNode) => void;
  onToggleStatus: (nodeId: string, status: CategoryStatus) => void;
};

const CategoryTreeTitle = memo(function CategoryTreeTitle({
  node,
  isActionPending,
  isDragging,
  isDropChildTarget,
  onSelectNode,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryTreeTitleProps) {
  const menuItems = buildAdminEntityActionMenuItems({
    isActive: node.categoryStatus === 'active',
    onEdit: () => onEdit(node.key),
    onToggleActive: () => onToggleStatus(node.key, node.categoryStatus === 'active' ? 'inactive' : 'active'),
    onDelete: () => onDelete(node),
  });

  return (
    <div
      data-category-id={node.key}
      className={`category-tree-title${node.categoryStatus === 'inactive' ? ' is-inactive' : ''}${isDropChildTarget ? ' is-drop-target-child' : ''}`}
    >
      <div
        className="category-tree-title__name-wrap"
        onClick={(event) => {
          stopTreeClickBubble(event);
          onSelectNode(node.key, node.name);
        }}
      >
        <CategoryTreeName
          title={node.name}
          tooltipTitle={node.tooltipTitle}
          isDragging={isDragging}
        />
      </div>
      <div
        className="category-tree-title__actions"
        onMouseDown={blockTreePointerEvent}
        onClick={stopTreeClickBubble}
      >
        <span
          className={`category-tree-title__status-dot category-tree-title__status-dot--${node.categoryStatus}`}
        />
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
          getPopupContainer={() => document.body}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            loading={isActionPending}
            className="category-tree-title__more"
          />
        </Dropdown>
      </div>
    </div>
  );
});

export function CategoryTreePanel({
  roots,
  rootsVersion,
  selectedId,
  pendingNodeId = null,
  onSelect,
  onReload,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryTreePanelProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [isPending, startTransition] = useTransition();
  const [treeData, setTreeData] = useState<CategoryTreeDataNode[]>(() => toTreeData(roots));
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropChildTargetKey, setDropChildTargetKey] = useState<string | null>(null);
  const [dropGapMarker, setDropGapMarker] = useState<CategoryTreeGapMarker | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draggingKeyRef = useRef<Key | null>(null);
  const dragLevelAnchorRef = useRef<CategoryTreeDragLevelAnchor | null>(null);
  const dropIntentRef = useRef<CategoryTreeDropIntent | null>(null);

  const isSearchMode = debouncedKeyword.length > 0;

  const updateDropPreview = useCallback((clientX: number, clientY: number) => {
    const panel = panelRef.current;
    const dragKey = draggingKeyRef.current;
    const anchor = dragLevelAnchorRef.current;
    if (!panel || !dragKey || !anchor) return;

    const levelClientX = resolveDragLevelClientX(anchor, clientX);

    const intent = resolveCategoryTreeDrop({
      panel,
      treeData,
      dragKey,
      clientX,
      clientY,
      levelClientX,
    });
    dropIntentRef.current = intent;
    setDropChildTargetKey(intent?.mode === 'child' ? intent.childTargetKey : null);
    setDropGapMarker(intent?.mode === 'sibling' ? intent.gapMarker : null);
  }, [treeData]);

  const applySearchKeyword = useCallback((value: string) => {
    setDebouncedKeyword(value.trim());
  }, []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setDebouncedKeyword('');
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedKeyword(trimmed);
    }, TREE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (debouncedKeyword) return;
    setTreeData(toTreeData(roots));
    setExpandedKeys([]);
  }, [roots, rootsVersion, debouncedKeyword]);

  useEffect(() => {
    if (!debouncedKeyword) {
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/categories/tree?keyword=${encodeURIComponent(debouncedKeyword)}`,
        );
        if (!response.ok) throw new Error('search failed');
        const payload = (await response.json()) as { matches: AdminCategoryTreeSearchMatch[] };
        if (cancelled) return;
        setTreeData(toSearchNodes(payload.matches));
        setExpandedKeys([]);
      } catch {
        if (!cancelled) void messageApi.error('搜索分类失败');
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, messageApi]);

  const handleDeleteNode = useCallback((node: CategoryTreeDataNode) => {
    const blockReason = getCategoryDeleteBlockReason({
      hasChildren: node.hasChildCategories,
      productCount: node.productCount,
    });
    if (blockReason) {
      void messageApi.warning(blockReason);
      return;
    }
    onDelete(node.key);
  }, [messageApi, onDelete]);

  const titleRender = useCallback((node: CategoryTreeDataNode) => (
    <CategoryTreeTitle
      node={node}
      isActionPending={pendingNodeId === node.key}
      isDragging={isDragging}
      isDropChildTarget={dropChildTargetKey === node.key}
      onSelectNode={onSelect}
      onEdit={onEdit}
      onDelete={handleDeleteNode}
      onToggleStatus={onToggleStatus}
    />
  ), [dropChildTargetKey, handleDeleteNode, isDragging, onEdit, onSelect, onToggleStatus, pendingNodeId]);

  const allowDrop = useCallback<NonNullable<TreeProps['allowDrop']>>(({ dragNode, dropNode, dropPosition }) => {
    if (dropPosition === 0) {
      const descendants = collectDescendantKeys(dragNode.key, treeData);
      if (descendants.has(String(dropNode.key))) return false;
    }
    return true;
  }, [treeData]);

  const handleDragStart = useCallback<NonNullable<TreeProps['onDragStart']>>((info) => {
    const panel = panelRef.current;
    const dragKey = info.node.key;
    draggingKeyRef.current = dragKey;
    dropIntentRef.current = null;
    setDropChildTargetKey(null);
    setDropGapMarker(null);
    setIsDragging(true);

    const nameLeft = panel ? measureDragNameLeft(panel, dragKey) : null;
    dragLevelAnchorRef.current = {
      startClientX: info.event.clientX,
      startNameLeft: nameLeft ?? info.event.clientX,
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    draggingKeyRef.current = null;
    dragLevelAnchorRef.current = null;
    dropIntentRef.current = null;
    setDropChildTargetKey(null);
    setDropGapMarker(null);
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback<NonNullable<TreeProps['onDragOver']>>((info) => {
    if (isSearchMode) return;
    updateDropPreview(info.event.clientX, info.event.clientY);
  }, [isSearchMode, updateDropPreview]);

  useEffect(() => {
    if (!isDragging || isSearchMode) return;

    const handleWindowDragOver = (event: DragEvent) => {
      event.preventDefault();
      updateDropPreview(event.clientX, event.clientY);
    };

    window.addEventListener('dragover', handleWindowDragOver);
    return () => window.removeEventListener('dragover', handleWindowDragOver);
  }, [isDragging, isSearchMode, updateDropPreview]);

  const handleDragEnter = useCallback<NonNullable<TreeProps['onDragEnter']>>((info) => {
    if (isSearchMode) return;
    const key = info.node.key;
    setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, [isSearchMode]);

  const onDrop = useCallback<NonNullable<TreeProps['onDrop']>>((info) => {
    if (isSearchMode) return;

    const dragKey = info.dragNode.key;
    const anchor = dragLevelAnchorRef.current;
    const levelClientX = anchor
      ? resolveDragLevelClientX(anchor, info.event.clientX)
      : info.event.clientX;
    const intent = dropIntentRef.current ?? resolveCategoryTreeDrop({
      panel: panelRef.current!,
      treeData,
      dragKey,
      clientX: info.event.clientX,
      clientY: info.event.clientY,
      levelClientX,
    });

    draggingKeyRef.current = null;
    dragLevelAnchorRef.current = null;
    dropIntentRef.current = null;
    setDropChildTargetKey(null);
    setDropGapMarker(null);
    setIsDragging(false);

    if (!intent) return;

    const descendants = collectDescendantKeys(dragKey, treeData);
    if (intent.mode === 'child' && descendants.has(intent.targetParentKey!)) {
      void messageApi.warning('不能将分类移动到其子分类下');
      return;
    }

    const applied = applyCategoryTreeDropIntent(treeData, dragKey, intent);
    if (!applied) return;

    const { data, parentId } = applied;
    syncBranchMeta(data);

    loopTree(data, dragKey, (item) => {
      item.parentId = parentId;
    });

    const moves = collectMovesFromTree(data);
    setTreeData(data);

    if (parentId) {
      setExpandedKeys((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    }

    startTransition(async () => {
      const response = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves }),
      });
      if (!response.ok) {
        void messageApi.error('分类排序保存失败');
        onReload();
        return;
      }
      void messageApi.success('分类顺序已更新');
      onReload();
    });
  }, [isSearchMode, messageApi, onReload, treeData]);

  const selectedKeys = useMemo(
    () => (selectedId && selectedId !== ROOT_CATEGORY_PARENT_KEY ? [selectedId] : []),
    [selectedId],
  );

  useLayoutEffect(() => {
    const root = panelRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('.ant-tree-node-content-wrapper[title]').forEach((element) => {
      element.removeAttribute('title');
    });
  }, [treeData, expandedKeys, isSearchMode, dropChildTargetKey, dropGapMarker]);

  useLayoutEffect(() => {
    const root = panelRef.current;
    if (!root) return;

    root.querySelectorAll('.category-tree-gap-before, .category-tree-gap-after').forEach((element) => {
      element.classList.remove('category-tree-gap-before', 'category-tree-gap-after');
    });

    if (!isDragging || !dropGapMarker) return;

    const anchor = root.querySelector<HTMLElement>(`[data-category-id="${dropGapMarker.anchorKey}"]`);
    const treenode = anchor?.closest<HTMLElement>('.ant-tree-treenode');
    if (!treenode) return;

    treenode.classList.add(
      dropGapMarker.position === 'before' ? 'category-tree-gap-before' : 'category-tree-gap-after',
    );
  }, [dropGapMarker, isDragging]);

  return (
    <div
      ref={panelRef}
      className={`category-tree-panel${isDragging ? ' is-category-tree-dragging' : ''}`}
    >
      {contextHolder}
      <Input.Search
        allowClear
        placeholder="搜索分类名称"
        value={searchInput}
        loading={searchLoading}
        onChange={(event) => setSearchInput(event.target.value)}
        onSearch={(value) => {
          setSearchInput(value);
          applySearchKeyword(value);
        }}
        className="category-tree-search"
      />
      <button
        type="button"
        className={`category-tree-root${selectedId === ROOT_CATEGORY_PARENT_KEY ? ' is-selected' : ''}`}
        onClick={() => onSelect(ROOT_CATEGORY_PARENT_KEY, '全部分类')}
      >
        全部分类
      </button>
      <div className="category-tree-panel__scroll" style={{ maxHeight: TREE_HEIGHT, overflow: 'auto' }}>
        <Tree
          key={`category-tree-${rootsVersion}`}
          blockNode
          selectable={false}
          draggable={!isSearchMode}
          showLine={false}
          treeData={treeData}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          allowDrop={isSearchMode ? undefined : allowDrop}
          dropIndicatorRender={() => null}
          titleRender={(node) => titleRender(node as CategoryTreeDataNode)}
          onExpand={(keys) => setExpandedKeys(keys)}
          onDragStart={isSearchMode ? undefined : handleDragStart}
          onDragEnd={isSearchMode ? undefined : handleDragEnd}
          onDragEnter={isSearchMode ? undefined : handleDragEnter}
          onDragOver={isSearchMode ? undefined : handleDragOver}
          onDrop={isSearchMode ? undefined : onDrop}
        />
      </div>
    </div>
  );
}
