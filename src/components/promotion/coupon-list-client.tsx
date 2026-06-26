'use client';

import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CouponEditorModal } from '@/components/promotion/coupon-editor-modal';
import { CouponSendModal } from '@/components/promotion/coupon-send-modal';
import {
  couponDiscountTypeColors,
  couponDiscountTypeLabels,
  couponScopeColors,
  couponScopeLabels,
  couponStatusColors,
  couponStatusLabels,
  couponDiscountTypeOptions,
  couponScopeOptions,
  couponStatusOptions,
  formatAdminDate,
  formatCouponDiscountSummary,
} from '@/lib/admin-display';
import { buildAdminListRowIndexColumn, readStoredPageSize, writeStoredPageSize } from '@/lib/admin-list-query';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import {
  type AdminCouponDetail,
  type AdminCouponListItem,
  type CouponListQuery,
  buildCouponListUrl,
  getCouponQuotaSummary,
  parseCouponListQuery,
} from '@/lib/coupon-list-query';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type CouponListState = {
  items: AdminCouponListItem[];
  total: number;
  page: number;
  pageSize: CouponListQuery['pageSize'];
};

type CouponListClientProps = {
  initialList: CouponListState;
  initialQuery: CouponListQuery;
  categoryTree: AdminCategoryTreeNode[];
  activeLanguages: AdminSiteLanguageRow[];
};

async function fetchCouponList(query: CouponListQuery): Promise<CouponListState> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.scope) params.set('scope', query.scope);
  if (query.discountType) params.set('discount_type', query.discountType);
  if (query.status) params.set('status', query.status);

  const response = await fetch(`/api/admin/coupons?${params.toString()}`);
  if (!response.ok) throw new Error('加载优惠券列表失败');

  const payload = (await response.json()) as {
    items: AdminCouponListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items.map((item) => ({
      ...item,
      startsAt: item.startsAt ? new Date(item.startsAt) : null,
      endsAt: item.endsAt ? new Date(item.endsAt) : null,
      createdAt: new Date(item.createdAt),
    })),
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as CouponListQuery['pageSize'],
  };
}

export function CouponListClient({
  initialList,
  initialQuery,
  categoryTree,
  activeLanguages,
}: CouponListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState(initialList);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isListLoading, startListTransition] = useTransition();
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminCouponDetail | null>(null);
  const [sendCoupon, setSendCoupon] = useState<AdminCouponListItem | null>(null);

  const replaceUrl = useCallback((nextQuery: CouponListQuery) => {
    router.replace(buildCouponListUrl('/admin/promotion/coupons', nextQuery), { scroll: false });
  }, [router]);

  const reloadList = useCallback((nextQuery: CouponListQuery) => {
    startListTransition(async () => {
      try {
        const result = await fetchCouponList(nextQuery);
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载优惠券列表失败');
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
    const urlQuery = parseCouponListQuery(Object.fromEntries(searchParams.entries()), {
      storedPageSize: readStoredPageSize(),
    });
    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }
    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<CouponListQuery>) {
    const nextQuery: CouponListQuery = {
      keyword: patch.keyword ?? query.keyword,
      scope: patch.scope ?? query.scope,
      discountType: patch.discountType ?? query.discountType,
      status: patch.status ?? query.status,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  async function openEditor(row?: AdminCouponListItem) {
    if (!row) {
      setEditingDetail(null);
      setEditorOpen(true);
      return;
    }

    const response = await fetch(`/api/admin/coupons/${row.id}`);
    if (!response.ok) {
      void messageApi.error('加载优惠券详情失败');
      return;
    }
    const detail = (await response.json()) as AdminCouponDetail;
    setEditingDetail({
      ...detail,
      startsAt: detail.startsAt ? new Date(detail.startsAt) : null,
      endsAt: detail.endsAt ? new Date(detail.endsAt) : null,
      createdAt: new Date(detail.createdAt),
    });
    setEditorOpen(true);
  }

  function toggleCoupon(row: AdminCouponListItem) {
    setPendingEntryId(row.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/coupons/${row.id}/toggle-status`, { method: 'POST' });
        if (!response.ok) {
          void messageApi.error('状态更新失败');
          return;
        }
        void messageApi.success(`优惠券已${row.status === 'active' ? '停用' : '启用'}`);
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function deleteCoupon(row: AdminCouponListItem) {
    setPendingEntryId(row.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/coupons/${row.id}`, { method: 'DELETE' });
        if (!response.ok) {
          void messageApi.error('删除失败');
          return;
        }
        void messageApi.success('优惠券已删除');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  const columns: ColumnsType<AdminCouponListItem> = [
    buildAdminListRowIndexColumn(query.page, query.pageSize),
    { title: 'Key', dataIndex: 'couponKey', width: 200, ...adminTableNowrapHeader() },
    { title: '名称', dataIndex: 'name', width: 180, ellipsis: true, ...adminTableNowrapHeader() },
    {
      title: '适用范围',
      dataIndex: 'scope',
      width: 110,
      render: (value: keyof typeof couponScopeLabels) => (
        <Tag color={couponScopeColors[value]}>{couponScopeLabels[value]}</Tag>
      ),
    },
    {
      title: '优惠类型',
      key: 'discount',
      width: 140,
      render: (_: unknown, row: AdminCouponListItem) => (
        <Space orientation="vertical" size={0}>
          <Tag color={couponDiscountTypeColors[row.discountType]}>{couponDiscountTypeLabels[row.discountType]}</Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatCouponDiscountSummary({
              discountType: row.discountType,
              discountValue: row.discountValue,
              defaultCurrencyCode: row.displayCurrencyCode,
            })}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '配额',
      key: 'quota',
      width: 110,
      render: (_: unknown, row: AdminCouponListItem) => {
        const summary = getCouponQuotaSummary(row);
        return <Tag color={summary.exhausted ? 'red' : 'default'}>{summary.label}</Tag>;
      },
    },
    {
      title: '有效期',
      key: 'validity',
      width: 180,
      render: (_: unknown, row: AdminCouponListItem) => (
        <Typography.Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
          {row.startsAt || row.endsAt
            ? `${row.startsAt ? formatAdminDate(row.startsAt) : '—'} ~ ${row.endsAt ? formatAdminDate(row.endsAt) : '—'}`
            : '长期'}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: keyof typeof couponStatusLabels) => (
        <Tag color={couponStatusColors[value]}>{couponStatusLabels[value]}</Tag>
      ),
    },
    adminTableFixedActionsColumn<AdminCouponListItem>({
      title: '操作',
      key: 'actions',
      width: 148,
      render: (_: unknown, row: AdminCouponListItem) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<SendOutlined />}
            title="发送至客户"
            onClick={() => setSendCoupon(row)}
          />
          <AdminEntityRowActions
            loading={pendingEntryId === row.id}
            entityName="优惠券"
            isActive={row.status === 'active'}
            onEdit={() => {
              void openEditor(row);
            }}
            onToggleActive={() => toggleCoupon(row)}
            onDelete={() => deleteCoupon(row)}
          />
        </Space>
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <CommercePageHeader
        title="优惠券"
        description="管理促销优惠券规则、使用限制与发放记录。前台注册与结账核销将在后续版本接入。"
        statusMessage={null}
        isPending={false}
        showSave={false}
      />

      <Card
        title="优惠券列表"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            void openEditor();
          }}>
            新增优惠券
          </Button>
        )}
      >
        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="搜索名称 / Key"
            style={{ width: 240 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
          />
          <Select
            allowClear
            placeholder="适用范围"
            style={{ width: 140 }}
            value={query.scope || undefined}
            options={couponScopeOptions}
            onChange={(value) => applyQueryChange({ scope: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="优惠类型"
            style={{ width: 120 }}
            value={query.discountType || undefined}
            options={couponDiscountTypeOptions}
            onChange={(value) => applyQueryChange({ discountType: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 120 }}
            value={query.status || undefined}
            options={couponStatusOptions}
            onChange={(value) => applyQueryChange({ status: value ?? '', page: 1 })}
          />
          <Typography.Text type="secondary">共 {listState.total} 条</Typography.Text>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={listState.items}
          pagination={false}
          scroll={adminTableScroll(1280)}
        />
        <AdminListPagination
          page={listState.page}
          pageSize={listState.pageSize}
          total={listState.total}
          disabled={isListLoading}
          onChange={({ page, pageSize }) => {
            writeStoredPageSize(pageSize);
            applyQueryChange({ page, pageSize });
          }}
        />
      </Card>

      <CouponEditorModal
        open={editorOpen}
        editing={editingDetail}
        activeLanguages={activeLanguages}
        categoryTree={categoryTree}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          reloadList(query);
        }}
      />

      <CouponSendModal
        open={Boolean(sendCoupon)}
        coupon={sendCoupon}
        onClose={() => setSendCoupon(null)}
        onSent={() => reloadList(query)}
      />
    </Space>
  );
}
