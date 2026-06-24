'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Input, Space, Table, Tag, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { brandStatusColors, brandStatusLabels, formatAdminDate } from '@/lib/admin-display';
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
  type AdminFeatureDefinitionListItem,
  type AdminFeatureDefinitionTranslation,
  featureSpecCategoryLabels,
  featureValueTypeLabels,
  resolveFeatureDefinitionId,
} from '@/lib/feature-definition-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export type FeatureDefinitionListState = {
  items: AdminFeatureDefinitionListItem[];
  total: number;
  activeCount: number;
  page: number;
  pageSize: AdminListPageSize;
};

type FeatureDefinitionListClientProps = {
  initialList: FeatureDefinitionListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
  renderEditorModal: (props: {
    open: boolean;
    editingEntry: AdminFeatureDefinitionListItem | null;
    onClose: () => void;
    onSaved: (saved: AdminFeatureDefinitionTranslation) => void;
  }) => ReactNode;
};

async function fetchFeatureDefinitionList(options: {
  keyword: string;
  page: number;
  pageSize: AdminListPageSize;
}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page));
  params.set('page_size', String(options.pageSize));
  if (options.keyword) params.set('keyword', options.keyword);

  const response = await fetch(`/api/admin/feature-definitions?${params.toString()}`);
  if (!response.ok) {
    throw new Error('加载特性列表失败');
  }

  const payload = (await response.json()) as {
    items: AdminFeatureDefinitionListItem[];
    meta: { total: number; activeCount: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    activeCount: payload.meta.activeCount,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function FeatureDefinitionListClient({
  initialList,
  initialQuery,
  activeLanguages,
  renderEditorModal,
}: FeatureDefinitionListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<FeatureDefinitionListState>(initialList);
  const [query, setQuery] = useState<AdminListQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminFeatureDefinitionListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const summaryStats = useMemo(() => [
    { label: '特性总数', value: listState.total },
    { label: '启用', value: listState.activeCount },
    { label: '当前页', value: listState.items.length },
  ], [listState.activeCount, listState.items.length, listState.total]);

  const replaceUrl = useCallback((nextQuery: AdminListQuery) => {
    router.replace(buildAdminListUrl('/admin/product-features', nextQuery), { scroll: false });
  }, [router]);

  useEffect(() => {
    if (hydratedPageSizeRef.current) return;
    hydratedPageSizeRef.current = true;
    const stored = readStoredPageSize();
    if (!searchParams.get('page_size') && stored && stored !== initialQuery.pageSize) {
      replaceUrl({ ...initialQuery, pageSize: stored, page: 1 });
    }
  }, [searchParams, initialQuery, replaceUrl]);

  const reloadList = useCallback((nextQuery: AdminListQuery) => {
    startTransition(async () => {
      try {
        const result = await fetchFeatureDefinitionList({
          keyword: nextQuery.keyword,
          page: nextQuery.page,
          pageSize: nextQuery.pageSize,
        });
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载特性列表失败');
      }
    });
  }, [messageApi]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    const urlQuery = parseAdminListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );

    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }

    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<AdminListQuery>) {
    const nextQuery: AdminListQuery = {
      board: '',
      parentId: '',
      keyword: patch.keyword ?? query.keyword,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };

    if (patch.pageSize) {
      writeStoredPageSize(patch.pageSize);
    }

    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  function openEditor(entry?: AdminFeatureDefinitionListItem) {
    if (!entry && !activeLanguages.length) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
    }
    setEditingEntry(entry ?? null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingEntry(null);
  }

  function handleSaved(saved: AdminFeatureDefinitionTranslation) {
    void (async () => {
      const response = await fetch(`/api/admin/feature-definitions/${resolveFeatureDefinitionId(saved)}`);
      if (response.ok) {
        const payload = (await response.json()) as { item: AdminFeatureDefinitionListItem };
        setEditingEntry(payload.item);
      }
      reloadList(query);
    })();
  }

  function patchStatus(entry: AdminFeatureDefinitionListItem, nextStatus: 'active' | 'inactive') {
    startTransition(async () => {
      const response = await fetch(`/api/admin/feature-definitions/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }

      void messageApi.success(`特性已${brandStatusLabels[nextStatus]}`);
      reloadList(query);
    });
  }

  function deleteEntry(entry: AdminFeatureDefinitionListItem) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/feature-definitions/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        void messageApi.error('特性删除失败');
        return;
      }
      void messageApi.success('特性已删除');
      reloadList(query);
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '特性名称',
      dataIndex: 'name',
      width: 160,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => <Typography.Text ellipsis title={value}>{value}</Typography.Text>,
    },
    {
      title: 'Key',
      dataIndex: 'key',
      width: 140,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'specCategory',
      width: 96,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: AdminFeatureDefinitionListItem['specCategory']) => (
        <Tag>{featureSpecCategoryLabels[value]}</Tag>
      ),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 96,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: AdminFeatureDefinitionListItem['valueType']) => (
        <Tag color="blue">{featureValueTypeLabels[value]}</Tag>
      ),
    },
    {
      title: '值',
      dataIndex: 'valueDisplay',
      width: 160,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => <Typography.Text ellipsis title={value}>{value}</Typography.Text>,
    },
    {
      title: '值单位',
      dataIndex: 'unit',
      width: 100,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null, row: AdminFeatureDefinitionListItem) => (
        row.valueType === 'number' && value
          ? <Tag color="green">{value}</Tag>
          : <Typography.Text type="secondary">—</Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: AdminFeatureDefinitionListItem['status']) => (
        <Tag color={brandStatusColors[value]}>{brandStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '语言数',
      dataIndex: 'localeCount',
      width: 72,
      align: 'center' as const,
      onHeaderCell: adminTableNowrapHeader,
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 148,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      render: (_: unknown, row: AdminFeatureDefinitionListItem) => (
        <AdminEntityRowActions
          loading={isPending}
          isActive={row.status === 'active'}
          entityName="特性"
          onEdit={() => openEditor(row)}
          onToggleActive={() => patchStatus(row, row.status === 'active' ? 'inactive' : 'active')}
          onDelete={() => deleteEntry(row)}
        />
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
          新建特性
        </Button>
      </Space>

      <Card>
        {!activeLanguages.length ? (
          <Empty description="请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages">
              <Button type="primary">前往多语言管理</Button>
            </Link>
          </Empty>
        ) : (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Input.Search
              placeholder="搜索特性名称、分类、值或单位"
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
              scroll={adminTableScroll(1080)}
              dataSource={listState.items}
              columns={columns}
              locale={{ emptyText: '暂无产品特性' }}
            />
            <AdminListPagination
              page={listState.page}
              pageSize={listState.pageSize}
              total={listState.total}
              disabled={isPending}
              onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
            />
          </Space>
        )}
      </Card>

      {renderEditorModal({
        open: editorOpen,
        editingEntry,
        onClose: closeEditor,
        onSaved: handleSaved,
      })}
    </Space>
  );
}
