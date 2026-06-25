'use client';

import { EyeOutlined } from '@ant-design/icons';
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminActionIconButton } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { InquiryViewSwitch } from '@/components/inquiries/inquiry-view-switch';
import {
  formatAdminDate,
  getInquiryResolutionLabel,
  inquiryResolutionColors,
  inquiryResolutionOptions,
  inquiryStatusColors,
  inquiryStatusLabels,
  inquiryStatusOptions,
} from '@/lib/admin-display';
import {
  type AdminListPageSize,
  buildAdminListRowIndexColumn,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import {
  buildInquiryDetailUrl,
  buildInquiryHistoryListUrl,
  type InquiryHistoryListQuery,
  parseInquiryHistoryListQuery,
} from '@/lib/inquiry-list-query';
import type { AdminInquiryListItem } from '@/server/admin/inquiries';

type InquiryHistoryListState = {
  items: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type InquiryHistoryListClientProps = {
  initialList: InquiryHistoryListState;
  initialQuery: InquiryHistoryListQuery;
};

async function fetchHistoryInquiries(query: InquiryHistoryListQuery): Promise<InquiryHistoryListState> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.status) params.set('status', query.status);
  if (query.resolution) params.set('resolution', query.resolution);

  const response = await fetch(`/api/admin/inquiries/history?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载历史询盘失败');

  const payload = (await response.json()) as {
    items: AdminInquiryListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

function getResolutionColor(item: AdminInquiryListItem) {
  if (item.terminatedAt) return inquiryResolutionColors.terminated;
  if (item.resolvedAt) return inquiryResolutionColors.resolved;
  return inquiryResolutionColors.replied;
}

export function InquiryHistoryListClient({ initialList, initialQuery }: InquiryHistoryListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState(initialList);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isPending, startTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: InquiryHistoryListQuery) => {
    router.replace(buildInquiryHistoryListUrl('/admin/inquiries/history', nextQuery), { scroll: false });
  }, [router]);

  const reloadList = useCallback((nextQuery: InquiryHistoryListQuery) => {
    startTransition(async () => {
      const result = await fetchHistoryInquiries(nextQuery);
      setListState(result);
      setQuery(nextQuery);
    });
  }, []);

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
    const urlQuery = parseInquiryHistoryListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );
    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }
    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<InquiryHistoryListQuery>) {
    const nextQuery: InquiryHistoryListQuery = {
      keyword: patch.keyword ?? query.keyword,
      status: patch.status ?? query.status,
      resolution: patch.resolution ?? query.resolution,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };
    if (patch.pageSize) writeStoredPageSize(patch.pageSize);
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  const columns: ColumnsType<AdminInquiryListItem> = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '产品',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
      ...adminTableNowrapHeader(),
    },
    {
      title: '客户',
      key: 'customer',
      width: 220,
      render: (_: unknown, row: AdminInquiryListItem) => (
        <div>
          <div>{row.fullName}</div>
          <Typography.Text type="secondary">{row.email}</Typography.Text>
        </div>
      ),
    },
    {
      title: '公司/国家',
      key: 'company',
      width: 160,
      ellipsis: true,
      render: (_: unknown, row: AdminInquiryListItem) => [row.company, row.country].filter(Boolean).join(' · ') || '—',
    },
    {
      title: '结束原因',
      key: 'resolution',
      width: 100,
      render: (_: unknown, row: AdminInquiryListItem) => {
        const label = getInquiryResolutionLabel(row);
        return label === '—' ? label : <Tag color={getResolutionColor(row)}>{label}</Tag>;
      },
    },
    {
      title: '销售状态',
      dataIndex: 'status',
      width: 100,
      render: (value: keyof typeof inquiryStatusLabels) => (
        <Tag color={inquiryStatusColors[value]}>{inquiryStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '最后消息',
      dataIndex: 'lastMessageAt',
      width: 148,
      render: (value: string | Date | null, row: AdminInquiryListItem) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>
          {formatAdminDate(value ?? row.createdAt)}
        </Typography.Text>
      ),
    },
    adminTableFixedActionsColumn<AdminInquiryListItem>({
      title: '操作',
      key: 'actions',
      width: 72,
      render: (_: unknown, row: AdminInquiryListItem) => (
        <AdminActionIconButton
          title="查看详情"
          icon={<EyeOutlined />}
          onClick={() => router.push(buildInquiryDetailUrl(row.id, 'history', query))}
        />
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="start">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>历史询盘</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            已回复、已终止或已解决的询盘工单记录。
          </Typography.Paragraph>
        </div>
      </Space>

      <InquiryViewSwitch current="history" />

      <Card>
        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="搜索姓名 / 邮箱 / 公司"
            style={{ width: 260 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
          />
          <Select
            allowClear
            placeholder="结束原因"
            style={{ width: 140 }}
            value={query.resolution || undefined}
            options={inquiryResolutionOptions}
            onChange={(value) => applyQueryChange({ resolution: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="销售状态"
            style={{ width: 140 }}
            value={query.status || undefined}
            options={inquiryStatusOptions}
            onChange={(value) => applyQueryChange({ status: value ?? '', page: 1 })}
          />
          <Typography.Text type="secondary">共 {listState.total} 条</Typography.Text>
        </Space>

        <Table
          rowKey="id"
          loading={isPending}
          dataSource={listState.items}
          columns={columns}
          pagination={false}
          scroll={adminTableScroll(1100)}
        />

        <AdminListPagination
          total={listState.total}
          page={listState.page}
          pageSize={listState.pageSize}
          onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
        />
      </Card>
    </Space>
  );
}
