'use client';

import {
  MoreOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Input, Tooltip, Tree, Typography, message } from 'antd';
import type { TreeProps } from 'antd/es/tree';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Key,
} from 'react';

import { buildAdminEntityActionMenuItems } from '@/components/admin/admin-row-actions';

import { categoryStatusLabels } from '@/lib/admin-display';
import {
  ROOT_CATEGORY_PARENT_KEY,
  type AdminCategoryTreeNode,
  type AdminCategoryTreeSearchMatch,
  type CategoryStatus,
  getCategoryDeleteBlockReason,
} from '@/lib/category-content';

const TREE_HEIGHT = 480;
const TREE_SEARCH_DEBOUNCE_MS = 400;

export type CategoryTreeDataNode = {
  key: string;
  title: string;
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

function toLevelNodes(nodes: AdminCategoryTreeNode[]): CategoryTreeDataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    tooltipTitle: node.name,
    isLeaf: !node.hasChildren,
    categoryStatus: node.status,
    productCount: node.productCount,
    hasChildCategories: node.hasChildren,
    parentId: node.parentId,
    sortOrder: node.sortOrder,
  }));
}

function toSearchNodes(matches: AdminCategoryTreeSearchMatch[]): CategoryTreeDataNode[] {
  return matches.map((match) => ({
    key: match.id,
    title: match.name,
    tooltipTitle: match.pathLabel,
    isLeaf: true,
    categoryStatus: match.status,
    productCount: match.productCount,
    hasChildCategories: match.hasChildren,
    parentId: match.parentId,
    sortOrder: match.sortOrder,
  }));
}

function updateTreeChildren(
  nodes: CategoryTreeDataNode[],
  key: Key,
  children: CategoryTreeDataNode[],
): CategoryTreeDataNode[] {
  return nodes.map((node) => {
    if (node.key === key) {
      return {
        ...node,
        children,
        isLeaf: children.length === 0,
        hasChildCategories: children.length > 0,
      };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: updateTreeChildren(node.children, key, children),
      };
    }
    return node;
  });
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

type CategoryTreeTitleProps = {
  node: CategoryTreeDataNode;
  isPending: boolean;
  onSelectNode: (nodeId: string, name: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (node: CategoryTreeDataNode) => void;
  onToggleStatus: (nodeId: string, status: CategoryStatus) => void;
};

const CategoryTreeTitle = memo(function CategoryTreeTitle({
  node,
  isPending,
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
    <div className={`category-tree-title${node.categoryStatus === 'inactive' ? ' is-inactive' : ''}`}>
      <div
        className="category-tree-title__name-wrap"
        onClick={(event) => {
          stopTreeClickBubble(event);
          onSelectNode(node.key, String(node.title));
        }}
      >
        <Typography.Text
          className="category-tree-title__name"
          ellipsis={{ tooltip: { title: node.tooltipTitle, mouseEnterDelay: 0.5 } }}
        >
          {node.title}
        </Typography.Text>
      </div>
      <div
        className="category-tree-title__actions"
        onMouseDown={blockTreePointerEvent}
        onClick={stopTreeClickBubble}
      >
        <Tooltip title={categoryStatusLabels[node.categoryStatus]} mouseEnterDelay={0.5}>
          <span
            className={`category-tree-title__status-dot category-tree-title__status-dot--${node.categoryStatus}`}
            aria-label={categoryStatusLabels[node.categoryStatus]}
          />
        </Tooltip>
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
            loading={isPending}
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
  onSelect,
  onReload,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryTreePanelProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [isPending, startTransition] = useTransition();
  const [treeData, setTreeData] = useState<CategoryTreeDataNode[]>(() => toLevelNodes(roots));
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const isSearchMode = debouncedKeyword.length > 0;

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
    setTreeData(toLevelNodes(roots));
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
      isPending={isPending}
      onSelectNode={onSelect}
      onEdit={onEdit}
      onDelete={handleDeleteNode}
      onToggleStatus={onToggleStatus}
    />
  ), [handleDeleteNode, isPending, onEdit, onSelect, onToggleStatus]);

  const loadData = useCallback(async (treeNode: CategoryTreeDataNode) => {
    const response = await fetch(`/api/admin/categories/tree?parent_id=${treeNode.key}`);
    if (!response.ok) {
      void messageApi.error('加载子分类失败');
      return;
    }
    const payload = (await response.json()) as { nodes: AdminCategoryTreeNode[] };
    setTreeData((prev) => updateTreeChildren(prev, treeNode.key, toLevelNodes(payload.nodes)));
  }, [messageApi]);

  const onDrop = useCallback<NonNullable<TreeProps['onDrop']>>((info) => {
    if (isSearchMode) return;

    const dragKey = info.dragNode.key;
    const dropKey = info.node.key;
    if (dragKey === dropKey) return;

    const descendants = collectDescendantKeys(dragKey, treeData);
    if (descendants.has(String(dropKey))) {
      void messageApi.warning('不能将分类移动到其子分类下');
      return;
    }

    const data = structuredClone(treeData);
    let dragObj: CategoryTreeDataNode | undefined;

    loopTree(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });
    if (!dragObj) return;

    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    if (!info.dropToGap) {
      loopTree(data, dropKey, (item) => {
        item.children = item.children ?? [];
        item.children.unshift(dragObj!);
        item.isLeaf = false;
        item.hasChildCategories = true;
      });
    } else {
      let siblings: CategoryTreeDataNode[] = [];
      let index = 0;
      loopTree(data, dropKey, (_item, itemIndex, arr) => {
        siblings = arr;
        index = itemIndex;
      });
      siblings.splice(dropPosition === -1 ? index : index + 1, 0, dragObj);
    }

    const moves = collectMovesFromTree(data);
    setTreeData(data);

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

  return (
    <div className="category-tree-panel">
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
      <Tree
        blockNode
        virtual
        height={TREE_HEIGHT}
        selectable={false}
        draggable={!isSearchMode}
        showLine={false}
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        loadData={isSearchMode ? undefined : loadData}
        titleRender={(node) => titleRender(node as CategoryTreeDataNode)}
        onExpand={(keys) => setExpandedKeys(keys)}
        onDrop={isSearchMode ? undefined : onDrop}
      />
    </div>
  );
}
