'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Image, Input, Modal, Skeleton, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { CategoryEditorModal } from '@/components/categories/category-editor-modal';
import { categoryStatusColors, categoryStatusLabels, formatAdminDate } from '@/lib/admin-display';
import {
  type AdminListPageSize,
  type AdminListQuery,
  buildAdminListRowIndexColumn,
  buildAdminListUrl,
  parseAdminListQuery,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import {
  ROOT_CATEGORY_PARENT_KEY,
  type AdminCategoryListItem,
  type AdminCategoryTreeNode,
  type CategoryStatus,
  getCategoryDeleteBlockReason,
} from '@/lib/category-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

const CategoryTreePanel = dynamic(
  () => import('@/components/categories/category-tree-panel').then((mod) => mod.CategoryTreePanel),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 8 }} title={false} />,
  },
);

export type CategoryListState = {
  items: AdminCategoryListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type CategoriesClientProps = {
  initialList: CategoryListState;
  initialQuery: AdminListQuery;
  initialTree: AdminCategoryTreeNode[];
  initialStats: { total: number; active: number };
  activeLanguages: AdminSiteLanguageRow[];
};

function findCategoryName(tree: AdminCategoryTreeNode[], id: string): string | null {
  for (const node of tree) {
    if (node.id === id) return node.name;
    const nested = findCategoryName(node.children, id);
    if (nested) return nested;
  }
  return null;
}

async function fetchEditorTree() {
  const response = await fetch('/api/admin/categories/tree?full=1');
  if (!response.ok) throw new Error('加载分类树失败');
  const payload = (await response.json()) as { tree: AdminCategoryTreeNode[] };
  return payload.tree;
}

async function fetchCategoryList(options: {
  parentId: string;
  keyword: string;
  page: number;
  pageSize: AdminListPageSize;
}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page));
  params.set('page_size', String(options.pageSize));
  if (options.parentId) params.set('parent_id', options.parentId);
  if (options.keyword) params.set('keyword', options.keyword);

  const response = await fetch(`/api/admin/categories?${params.toString()}`);
  if (!response.ok) throw new Error('加载分类列表失败');

  const payload = (await response.json()) as {
    items: AdminCategoryListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

async function fetchCategoryTree() {
  const response = await fetch('/api/admin/categories/tree?full=1');
  if (!response.ok) throw new Error('加载分类树失败');
  const payload = (await response.json()) as {
    tree: AdminCategoryTreeNode[];
    stats: { total: number; active: number };
  };
  return payload;
}

export function CategoriesClient({
  initialList,
  initialQuery,
  initialTree,
  initialStats,
  activeLanguages,
}: CategoriesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<CategoryListState>(initialList);
  const [query, setQuery] = useState<AdminListQuery>(initialQuery);
  const [treeRoots, setTreeRoots] = useState(initialTree);
  const [treeRootsVersion, setTreeRootsVersion] = useState(0);
  const [editorTree, setEditorTree] = useState<AdminCategoryTreeNode[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [selectedParentId, setSelectedParentId] = useState(
    initialQuery.parentId || ROOT_CATEGORY_PARENT_KEY,
  );
  const [selectedParentLabel, setSelectedParentLabel] = useState(() => {
    if (!initialQuery.parentId || initialQuery.parentId === ROOT_CATEGORY_PARENT_KEY) return '全部分类';
    return findCategoryName(initialTree, initialQuery.parentId) ?? '当前分类';
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminCategoryListItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const replaceUrl = useCallback((nextQuery: AdminListQuery) => {
    router.replace(buildAdminListUrl('/admin/categories', nextQuery), { scroll: false });
  }, [router]);

  const refreshTree = useCallback(async () => {
    try {
      const payload = await fetchCategoryTree();
      setTreeRoots(payload.tree);
      setStats(payload.stats);
      setTreeRootsVersion((version) => version + 1);
      setEditorTree([]);
    } catch {
      void messageApi.error('加载分类树失败');
    }
  }, [messageApi]);

  const reloadList = useCallback((nextQuery: AdminListQuery) => {
    startTransition(async () => {
      try {
        const result = await fetchCategoryList({
          parentId: nextQuery.parentId === ROOT_CATEGORY_PARENT_KEY ? '' : nextQuery.parentId,
          keyword: nextQuery.keyword,
          page: nextQuery.page,
          pageSize: nextQuery.pageSize,
        });
        setListState(result);
        setQuery(nextQuery);
        setSelectedParentId(nextQuery.parentId || ROOT_CATEGORY_PARENT_KEY);
      } catch {
        void messageApi.error('加载分类列表失败');
      }
    });
  }, [messageApi]);

  useEffect(() => {
    if (hydratedPageSizeRef.current) return;
    hydratedPageSizeRef.current = true;
    const stored = readStoredPageSize();
    if (!searchParams.get('page_size') && stored && stored !== initialQuery.pageSize) {
      replaceUrl({ ...initialQuery, pageSize: stored, page: 1 });
    }
  }, [searchParams, initialQuery, replaceUrl]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    const urlQuery = parseAdminListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );
    const normalizedQuery: AdminListQuery = {
      ...urlQuery,
      parentId: urlQuery.parentId || ROOT_CATEGORY_PARENT_KEY,
      board: '',
    };

    if (searchParams.get('page_size')) {
      writeStoredPageSize(normalizedQuery.pageSize);
    }

    setSearchInput(normalizedQuery.keyword);
    reloadList(normalizedQuery);
  }, [searchParams, reloadList]);

  const summaryStats = useMemo(() => [
    { label: '分类总数', value: stats.total },
    { label: '已启用', value: stats.active },
    { label: '当前层级', value: listState.total },
  ], [stats, listState.total]);

  function applyQueryChange(patch: Partial<AdminListQuery>) {
    const nextQuery: AdminListQuery = {
      board: '',
      parentId: patch.parentId ?? query.parentId ?? ROOT_CATEGORY_PARENT_KEY,
      keyword: patch.keyword ?? query.keyword,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };

    if (patch.pageSize) writeStoredPageSize(patch.pageSize);
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  function handleSelectTreeNode(id: string, name: string) {
    setSelectedParentLabel(id === ROOT_CATEGORY_PARENT_KEY ? '全部分类' : name);
    applyQueryChange({ parentId: id, page: 1 });
  }

  async function ensureEditorTree() {
    if (editorTree.length) return editorTree;
    const tree = await fetchEditorTree();
    setEditorTree(tree);
    return tree;
  }

  function openCreate() {
    const parentId = selectedParentId === ROOT_CATEGORY_PARENT_KEY ? null : selectedParentId;
    void (async () => {
      setEditorLoading(true);
      try {
        await ensureEditorTree();
        setDefaultParentId(parentId);
        setEditingEntry(null);
        setEditorOpen(true);
      } finally {
        setEditorLoading(false);
      }
    })();
  }

  function openEditor(entry: AdminCategoryListItem) {
    void (async () => {
      setEditorLoading(true);
      try {
        await ensureEditorTree();
        setDefaultParentId(entry.parentId);
        setEditingEntry(entry);
        setEditorOpen(true);
      } finally {
        setEditorLoading(false);
      }
    })();
  }

  function openEditorById(categoryId: string) {
    void (async () => {
      setEditorLoading(true);
      try {
        const response = await fetch(`/api/admin/categories/${categoryId}`);
        if (!response.ok) {
          void messageApi.error('加载分类失败');
          return;
        }
        const payload = (await response.json()) as { item: AdminCategoryListItem };
        await ensureEditorTree();
        setDefaultParentId(payload.item.parentId);
        setEditingEntry(payload.item);
        setEditorOpen(true);
      } finally {
        setEditorLoading(false);
      }
    })();
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingEntry(null);
    setDefaultParentId(null);
  }

  function handleSaved() {
    void refreshTree();
    reloadList(query);
  }

  function patchCategoryStatus(entry: AdminCategoryListItem, nextStatus: CategoryStatus) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/categories/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }
      void messageApi.success(`分类已${categoryStatusLabels[nextStatus]}`);
      await refreshTree();
      reloadList(query);
    });
  }

  function performDeleteCategory(entry: Pick<AdminCategoryListItem, 'id'>) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/categories/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        void messageApi.error(payload?.message ?? '分类删除失败');
        return;
      }
      void messageApi.success('分类已删除');
      await refreshTree();
      reloadList(query);
    });
  }

  function promptDeleteCategory(entry: Pick<AdminCategoryListItem, 'id' | 'hasChildren' | 'productCount'>) {
    const blockReason = getCategoryDeleteBlockReason(entry);
    if (blockReason) {
      void messageApi.warning(blockReason);
      return;
    }

    Modal.confirm({
      title: '确定删除该分类吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => performDeleteCategory(entry),
    });
  }

  const nowrapHeader = () => ({ style: { whiteSpace: 'nowrap' as const } });

  const columns = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: 'Logo',
      dataIndex: 'imageUrl',
      width: 72,
      onHeaderCell: nowrapHeader,
      render: (value: string | null) => value ? (
        <Image
          src={value}
          alt="分类 Logo"
          width={32}
          height={32}
          style={{ objectFit: 'contain', borderRadius: 6, background: '#fafafa' }}
          preview={{ mask: '预览' }}
        />
      ) : (
        <Typography.Text type="secondary">—</Typography.Text>
      ),
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
      onHeaderCell: nowrapHeader,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      width: 160,
      ellipsis: true,
      onHeaderCell: nowrapHeader,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '产品数',
      dataIndex: 'productCount',
      width: 72,
      align: 'center' as const,
      onHeaderCell: nowrapHeader,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: nowrapHeader,
      render: (value: CategoryStatus) => (
        <Tag color={categoryStatusColors[value]}>{categoryStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 148,
      onHeaderCell: nowrapHeader,
      render: (value: string) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      onHeaderCell: nowrapHeader,
      render: (_: unknown, row: AdminCategoryListItem) => (
        <AdminEntityRowActions
          loading={isPending}
          isActive={row.status === 'active'}
          entityName="分类"
          onEdit={() => openEditor(row)}
          onToggleActive={() => patchCategoryStatus(row, row.status === 'active' ? 'inactive' : 'active')}
          onDelete={() => promptDeleteCategory(row)}
          deleteMode="callback"
        />
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <AdminPageHeaderStats items={summaryStats} />

      <div className="category-admin-layout">
        <Card className="category-admin-tree-card">
          <CategoryTreePanel
            roots={treeRoots}
            rootsVersion={treeRootsVersion}
            selectedId={selectedParentId}
            onSelect={handleSelectTreeNode}
            onReload={() => { void refreshTree(); }}
            onEdit={openEditorById}
            onDelete={(id) => {
              const entry = listState.items.find((item) => item.id === id);
              if (entry) {
                promptDeleteCategory(entry);
                return;
              }
              void (async () => {
                const response = await fetch(`/api/admin/categories/${id}`);
                if (!response.ok) return;
                const payload = (await response.json()) as { item: AdminCategoryListItem };
                promptDeleteCategory(payload.item);
              })();
            }}
            onToggleStatus={(id, status) => {
              const entry = listState.items.find((item) => item.id === id);
              if (entry) {
                patchCategoryStatus(entry, status);
                return;
              }
              void (async () => {
                const response = await fetch(`/api/admin/categories/${id}`);
                if (!response.ok) return;
                const payload = (await response.json()) as { item: AdminCategoryListItem };
                patchCategoryStatus(payload.item, status);
              })();
            }}
          />
        </Card>

        <Card className="category-admin-list-card">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div className="category-list-internal-header">
              <Typography.Title level={5} style={{ margin: 0 }}>{selectedParentLabel}</Typography.Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新建子分类
              </Button>
            </div>

            <Input.Search
              placeholder="搜索分类名称、Slug、描述"
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
              style={{ maxWidth: 360 }}
            />

            <Table
              rowKey="id"
              loading={isPending}
              pagination={false}
              tableLayout="fixed"
              style={{ width: '100%' }}
              dataSource={listState.items}
              columns={columns}
              locale={{ emptyText: '该层级下暂无子分类' }}
            />

            <AdminListPagination
              page={listState.page}
              pageSize={listState.pageSize}
              total={listState.total}
              disabled={isPending}
              onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
            />
          </Space>
        </Card>
      </div>

      <CategoryEditorModal
        open={editorOpen}
        editorLoading={editorLoading}
        activeLanguages={activeLanguages}
        editingEntry={editingEntry}
        defaultParentId={defaultParentId}
        tree={editorTree}
        onClose={closeEditor}
        onSaved={() => {
          handleSaved();
        }}
      />
    </Space>
  );
}
