'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Image, Input, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
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
import type { AdminBrandListItem, AdminBrandTranslation } from '@/lib/brand-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export type BrandListState = {
  items: AdminBrandListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type BrandListClientProps = {
  initialList: BrandListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
  renderEditorModal: (props: {
    open: boolean;
    editingEntry: AdminBrandListItem | null;
    onClose: () => void;
    onSaved: (saved: AdminBrandTranslation) => void;
  }) => ReactNode;
};

async function fetchBrandList(options: {
  keyword: string;
  page: number;
  pageSize: AdminListPageSize;
}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page));
  params.set('page_size', String(options.pageSize));
  if (options.keyword) params.set('keyword', options.keyword);

  const response = await fetch(`/api/admin/brands?${params.toString()}`);
  if (!response.ok) {
    throw new Error('加载品牌列表失败');
  }

  const payload = (await response.json()) as {
    items: AdminBrandListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function BrandListClient({
  initialList,
  initialQuery,
  activeLanguages,
  renderEditorModal,
}: BrandListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<BrandListState>(initialList);
  const [query, setQuery] = useState<AdminListQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminBrandListItem | null>(null);
  const [isListLoading, startListTransition] = useTransition();
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const replaceUrl = useCallback((nextQuery: AdminListQuery) => {
    router.replace(buildAdminListUrl('/admin/brands', nextQuery), { scroll: false });
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
    startListTransition(async () => {
      try {
        const result = await fetchBrandList({
          keyword: nextQuery.keyword,
          page: nextQuery.page,
          pageSize: nextQuery.pageSize,
        });
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载品牌列表失败');
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

  function openEditor(entry?: AdminBrandListItem) {
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

  function handleSaved(saved: AdminBrandTranslation) {
    void (async () => {
      const response = await fetch(`/api/admin/brands/${saved.brandId}`);
      if (response.ok) {
        const payload = (await response.json()) as { item: AdminBrandListItem };
        setEditingEntry(payload.item);
      }
      reloadList(query);
    })();
  }

  function patchBrandStatus(entry: AdminBrandListItem, nextStatus: 'active' | 'inactive') {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/brands/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!response.ok) {
          void messageApi.error('状态更新失败');
          return;
        }

        void messageApi.success(`品牌已${brandStatusLabels[nextStatus]}`);
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function deleteBrand(entry: AdminBrandListItem) {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/brands/${entry.id}`, { method: 'DELETE' });
        if (!response.ok) {
          void messageApi.error('品牌删除失败');
          return;
        }
        void messageApi.success('品牌已删除');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  const columns = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => value ? (
        <Image
          src={value}
          alt="品牌 Logo"
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
      title: '品牌名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
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
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '产品',
      dataIndex: 'productCount',
      width: 64,
      align: 'center' as const,
      onHeaderCell: adminTableNowrapHeader,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: 'active' | 'inactive') => (
        <Tag color={brandStatusColors[value]}>{brandStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '官网',
      dataIndex: 'websiteUrl',
      width: 120,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => value ? (
        <Tooltip title={value}>
          <Typography.Link href={value} target="_blank" rel="noreferrer" ellipsis>
            {value.replace(/^https?:\/\//, '')}
          </Typography.Link>
        </Tooltip>
      ) : '—',
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
      render: (_: unknown, row: AdminBrandListItem) => (
        <AdminEntityRowActions
          loading={pendingEntryId === row.id}
          isActive={row.status === 'active'}
          entityName="品牌"
          onEdit={() => openEditor(row)}
          onToggleActive={() => patchBrandStatus(row, row.status === 'active' ? 'inactive' : 'active')}
          onDelete={() => deleteBrand(row)}
        />
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
          新建品牌
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
              placeholder="搜索品牌名称、Slug、描述"
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
              style={{ maxWidth: 360 }}
            />
            <Table
              rowKey="id"
              pagination={false}
              tableLayout="fixed"
              style={{ width: '100%' }}
              scroll={adminTableScroll(1020)}
              dataSource={listState.items}
              columns={columns}
              locale={{ emptyText: '暂无品牌' }}
            />
            <AdminListPagination
              page={listState.page}
              pageSize={listState.pageSize}
              total={listState.total}
              disabled={isListLoading}
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
