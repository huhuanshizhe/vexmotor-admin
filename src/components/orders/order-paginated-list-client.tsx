'use client';

import { EyeOutlined } from '@ant-design/icons';
import { Card, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminActionIconButton } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { OrderViewSwitch } from '@/components/orders/order-view-switch';
import {
  formatAdminDate,
  formatAdminMoney,
  orderStatusColors,
  orderStatusLabels,
  refundTypeLabels,
  returnTypeLabels,
} from '@/lib/admin-display';
import {
  type AdminListPageSize,
  buildAdminListRowIndexColumn,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import {
  buildOrderDetailUrl,
  buildOrderHistoryListUrl,
  type OrderHistoryListQuery,
  parseOrderHistoryListQuery,
} from '@/lib/order-list-query';
import type { OrderListView } from '@/lib/order-status';
import type { AdminOrderListItem } from '@/server/admin/orders';

type OrderListState = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type OrderPaginatedListClientProps = {
  view: OrderListView;
  title: string;
  description: string;
  apiPath: string;
  initialList: OrderListState;
  initialQuery: OrderHistoryListQuery;
};

async function fetchOrders(apiPath: string, query: OrderHistoryListQuery): Promise<OrderListState> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);

  const response = await fetch(`${apiPath}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载订单列表失败');

  const payload = (await response.json()) as {
    items: AdminOrderListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

const listPaths: Record<OrderListView, string> = {
  pending: '/admin/orders',
  processed: '/admin/orders/processed',
  refunds: '/admin/orders/refunds',
  history: '/admin/orders/history',
};

export function OrderPaginatedListClient({
  view,
  title,
  description,
  apiPath,
  initialList,
  initialQuery,
}: OrderPaginatedListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState(initialList);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isPending, startTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: OrderHistoryListQuery) => {
    router.replace(buildOrderHistoryListUrl(listPaths[view], nextQuery), { scroll: false });
  }, [router, view]);

  const reloadList = useCallback((nextQuery: OrderHistoryListQuery) => {
    startTransition(async () => {
      const result = await fetchOrders(apiPath, nextQuery);
      setListState(result);
      setQuery(nextQuery);
    });
  }, [apiPath]);

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
    const urlQuery = parseOrderHistoryListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );
    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }
    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<OrderHistoryListQuery>) {
    const nextQuery: OrderHistoryListQuery = {
      keyword: patch.keyword ?? query.keyword,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };
    if (patch.pageSize) writeStoredPageSize(patch.pageSize);
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  const columns: ColumnsType<AdminOrderListItem> = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      width: 160,
      ellipsis: true,
      ...adminTableNowrapHeader(),
    },
    {
      title: '客户',
      key: 'customer',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        const name = `${record.customerName ?? ''} ${record.customerLastName ?? ''}`.trim();
        return [name || null, record.customerEmail].filter(Boolean).join(' · ') || '—';
      },
      ...adminTableNowrapHeader(),
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (value: string) => formatAdminMoney(value),
      ...adminTableNowrapHeader(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: AdminOrderListItem['status']) => (
        <Tag color={orderStatusColors[value]}>{orderStatusLabels[value]}</Tag>
      ),
      ...adminTableNowrapHeader(),
    },
    ...(view === 'refunds'
      ? [
          {
            title: '退款类型',
            key: 'refundType',
            width: 100,
            render: (_: unknown, record: AdminOrderListItem) =>
              record.refundType ? refundTypeLabels[record.refundType] : '—',
            ...adminTableNowrapHeader(),
          } as ColumnsType<AdminOrderListItem>[number],
          {
            title: '退货类型',
            key: 'returnType',
            width: 100,
            render: (_: unknown, record: AdminOrderListItem) =>
              record.returnType ? returnTypeLabels[record.returnType] : '—',
            ...adminTableNowrapHeader(),
          } as ColumnsType<AdminOrderListItem>[number],
        ]
      : []),
    {
      title: '下单时间',
      dataIndex: 'placedAt',
      width: 160,
      render: (value: Date | null, record) => formatAdminDate(value ?? record.createdAt),
      ...adminTableNowrapHeader(),
    },
    adminTableFixedActionsColumn<AdminOrderListItem>({
      key: 'actions',
      title: '操作',
      render: (_, record) => (
        <AdminActionIconButton
          icon={<EyeOutlined />}
          title="查看详情"
          onClick={() => router.push(buildOrderDetailUrl(record.orderNumber, view, query))}
        />
      ),
    }),
  ];

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ margin: '8px 0 0', color: '#677489' }}>{description}</p>
      </div>

      <OrderViewSwitch current={view} />

      <Card>
        <Space wrap style={{ width: '100%', marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索订单号 / 客户邮箱"
            style={{ width: 280 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
          />
        </Space>

        {isPending ? <Typography.Text type="secondary">加载中…</Typography.Text> : null}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={listState.items}
          pagination={false}
          scroll={adminTableScroll(view === 'refunds' ? 1180 : 980)}
          locale={{ emptyText: '暂无订单' }}
        />

        <AdminListPagination
          page={listState.page}
          pageSize={listState.pageSize}
          total={listState.total}
          onChange={(next) => applyQueryChange(next)}
        />
      </Card>
    </main>
  );
}

export function OrderProcessedListClient(props: Omit<OrderPaginatedListClientProps, 'view' | 'title' | 'description' | 'apiPath'>) {
  return (
    <OrderPaginatedListClient
      view="processed"
      title="已处理订单"
      description="部分发货或已发货、且无待处理退款的订单。"
      apiPath="/api/admin/orders/processed"
      {...props}
    />
  );
}

export function OrderRefundListClient(props: Omit<OrderPaginatedListClientProps, 'view' | 'title' | 'description' | 'apiPath'>) {
  return (
    <OrderPaginatedListClient
      view="refunds"
      title="退款订单"
      description="有待处理退款申请的订单。"
      apiPath="/api/admin/orders/refunds"
      {...props}
    />
  );
}

export function OrderHistoryListClient(props: Omit<OrderPaginatedListClientProps, 'view' | 'title' | 'description' | 'apiPath'>) {
  return (
    <OrderPaginatedListClient
      view="history"
      title="历史订单"
      description="已完成、已取消、已终止或已退款的订单。"
      apiPath="/api/admin/orders/history"
      {...props}
    />
  );
}
