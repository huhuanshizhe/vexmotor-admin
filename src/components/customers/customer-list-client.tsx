'use client';

import {
  CheckOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  KeyOutlined,
  MailOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { CustomerCreateModal, type CreateCustomerFormValues } from '@/components/customers/customer-create-modal';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminActionIconButton, ADMIN_ACTION_TOOLTIP_PROPS, AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { CustomerAddressesModal } from '@/components/customers/customer-addresses-modal';
import { CustomerDetailModal } from '@/components/customers/customer-detail-modal';
import { CustomerMessagesModal } from '@/components/customers/customer-messages-modal';
import { CustomerResetPasswordModal } from '@/components/customers/customer-reset-password-modal';
import {
  formatAdminDate,
  formatAdminMoney,
  userRoleColors,
  userRoleLabels,
  userRoleOptions,
  userStatusColors,
  userStatusLabels,
  userStatusOptions,
} from '@/lib/admin-display';
import {
  type AdminListPageSize,
  buildAdminListRowIndexColumn,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import { customerIndustryFilterOptions, formatCustomerIndustryLabel } from '@/lib/customer-industries';
import {
  buildCustomerListUrl,
  type CustomerListQuery,
  parseCustomerListQuery,
} from '@/lib/customer-list-query';
import type { AdminCustomerListItem } from '@/server/admin/customers';

export type CustomerListState = {
  items: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type CustomerListClientProps = {
  initialList: CustomerListState;
  initialQuery: CustomerListQuery;
  countryOptions: Array<{ value: string; label: string }>;
  countryLabelByCode: Record<string, string>;
};

async function fetchCustomerList(query: CustomerListQuery): Promise<CustomerListState> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.status) params.set('status', query.status);
  if (query.role) params.set('role', query.role);
  if (query.industry) params.set('industry', query.industry);
  if (query.country) params.set('country', query.country);

  const response = await fetch(`/api/admin/customers?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('加载客户列表失败');
  }

  const payload = (await response.json()) as {
    items: AdminCustomerListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function CustomerListClient({
  initialList,
  initialQuery,
  countryOptions,
  countryLabelByCode,
}: CustomerListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<CustomerListState>(initialList);
  const [query, setQuery] = useState<CustomerListQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isListLoading, startListTransition] = useTransition();
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  const [addressOpen, setAddressOpen] = useState(false);
  const [addressCustomer, setAddressCustomer] = useState<AdminCustomerListItem | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageCustomer, setMessageCustomer] = useState<AdminCustomerListItem | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [resetCustomerEmail, setResetCustomerEmail] = useState<string | undefined>();

  const [createOpen, setCreateOpen] = useState(false);

  const replaceUrl = useCallback((nextQuery: CustomerListQuery) => {
    router.replace(buildCustomerListUrl('/admin/customers', nextQuery), { scroll: false });
  }, [router]);

  const reloadList = useCallback((nextQuery: CustomerListQuery) => {
    startListTransition(async () => {
      try {
        const result = await fetchCustomerList(nextQuery);
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载客户列表失败');
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

    const urlQuery = parseCustomerListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );

    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }

    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<CustomerListQuery>) {
    const nextQuery: CustomerListQuery = {
      keyword: patch.keyword ?? query.keyword,
      status: patch.status ?? query.status,
      role: patch.role ?? query.role,
      industry: patch.industry ?? query.industry,
      country: patch.country ?? query.country,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };

    if (patch.pageSize) {
      writeStoredPageSize(patch.pageSize);
    }

    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  function openDetail(row: AdminCustomerListItem) {
    setDetailCustomerId(row.id);
    setDetailOpen(true);
  }

  function reviewCustomer(row: AdminCustomerListItem, action: 'approve' | 'reject') {
    setPendingEntryId(row.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/customers/${row.id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!response.ok) {
          void messageApi.error(action === 'approve' ? '审核通过失败' : '审核不通过失败');
          return;
        }
        void messageApi.success(action === 'approve' ? '客户已审核通过' : '客户已审核不通过');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function toggleCustomerStatus(row: AdminCustomerListItem) {
    const nextStatus = row.status === 'active' ? 'disabled' : 'active';
    setPendingEntryId(row.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/customers/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          void messageApi.error('状态更新失败');
          return;
        }
        void messageApi.success(nextStatus === 'active' ? '客户已启用' : '客户已停用');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function resetPasswordForCustomer(row: AdminCustomerListItem) {
    setPendingEntryId(row.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/customers/${row.id}/reset-password`, { method: 'POST' });
        if (!response.ok) {
          void messageApi.error('重置密码失败');
          return;
        }
        const payload = (await response.json()) as { temporaryPassword: string };
        setResetPassword(payload.temporaryPassword);
        setResetCustomerEmail(row.email);
        setResetOpen(true);
        void messageApi.success('密码已重置');
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function createCustomer(values: CreateCustomerFormValues) {
    startCreateTransition(async () => {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          company: values.company || null,
          phone: values.phone || null,
          password: values.password,
          role: values.role,
        }),
      });
      if (!response.ok) {
        void messageApi.error('保存失败');
        return;
      }
      void messageApi.success('保存成功');
      setCreateOpen(false);
      reloadList({ ...query, page: 1 });
    });
  }

  const columns: ColumnsType<AdminCustomerListItem> = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '客户',
      key: 'customer',
      width: 220,
      ...adminTableNowrapHeader(),
      render: (_: unknown, row: AdminCustomerListItem) => (
        <div>
          <div>{row.firstName} {row.lastName}</div>
          <Typography.Text type="secondary">{row.email}</Typography.Text>
        </div>
      ),
    },
    {
      title: '公司',
      dataIndex: 'company',
      width: 140,
      ellipsis: true,
      ...adminTableNowrapHeader(),
      render: (value: string | null) => value ?? '未填写',
    },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 140,
      ellipsis: true,
      ...adminTableNowrapHeader(),
      render: (value: string | null) => formatCustomerIndustryLabel(value),
    },
    {
      title: '国家',
      dataIndex: 'companyCountryCode',
      width: 220,
      ellipsis: true,
      ...adminTableNowrapHeader(),
      render: (value: string | null) => (value ? countryLabelByCode[value] ?? value : '—'),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 90,
      ...adminTableNowrapHeader(),
      render: (value: keyof typeof userRoleLabels) => (
        <Tag color={userRoleColors[value]}>{userRoleLabels[value]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      ...adminTableNowrapHeader(),
      render: (value: keyof typeof userStatusLabels) => (
        <Tag color={userStatusColors[value]}>{userStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '订单',
      dataIndex: 'orderCount',
      width: 72,
      align: 'right' as const,
      ...adminTableNowrapHeader(),
    },
    {
      title: '询盘',
      dataIndex: 'inquiryCount',
      width: 72,
      align: 'right' as const,
      ...adminTableNowrapHeader(),
    },
    {
      title: '成交额',
      dataIndex: 'totalSpent',
      width: 120,
      align: 'right' as const,
      ...adminTableNowrapHeader(),
      render: (value: number) => formatAdminMoney(value),
    },
    {
      title: '收货地址',
      key: 'addresses',
      width: 96,
      align: 'center' as const,
      ...adminTableNowrapHeader(),
      render: (_: unknown, row: AdminCustomerListItem) => (
        <Tooltip title="查看收货地址" {...ADMIN_ACTION_TOOLTIP_PROPS}>
          <button
            type="button"
            className="admin-count-hotzone"
            aria-label="查看收货地址"
            onClick={() => {
              setAddressCustomer(row);
              setAddressOpen(true);
            }}
          >
            <span className="admin-count-hotzone__icon"><EnvironmentOutlined /></span>
            <span className="admin-count-hotzone__count">({row.addressCount})</span>
          </button>
        </Tooltip>
      ),
    },
    {
      title: '站内信',
      key: 'messages',
      width: 96,
      align: 'center' as const,
      ...adminTableNowrapHeader(),
      render: (_: unknown, row: AdminCustomerListItem) => (
        <Tooltip title="查看站内信" {...ADMIN_ACTION_TOOLTIP_PROPS}>
          <button
            type="button"
            className="admin-count-hotzone"
            aria-label="查看站内信"
            onClick={() => {
              setMessageCustomer(row);
              setMessageOpen(true);
            }}
          >
            <span className="admin-count-hotzone__icon"><MailOutlined /></span>
            <span className="admin-count-hotzone__count">({row.messageCount})</span>
          </button>
        </Tooltip>
      ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 148,
      ...adminTableNowrapHeader(),
      render: (value: string | Date | null) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    adminTableFixedActionsColumn<AdminCustomerListItem>({
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, row: AdminCustomerListItem) => (
        <Space size={0} className="admin-row-actions">
          <AdminActionIconButton title="查看详情" icon={<EyeOutlined />} onClick={() => openDetail(row)} />
          {row.status === 'pending' ? (
            <>
              <Popconfirm
                title="确定审核通过该客户吗？"
                description="通过后客户可正常登录前台。"
                okText="通过"
                cancelText="取消"
                onConfirm={() => reviewCustomer(row, 'approve')}
              >
                <span className="admin-row-action-trigger" onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="审核通过" {...ADMIN_ACTION_TOOLTIP_PROPS}>
                    <Button type="text" size="small" icon={<CheckOutlined />} loading={pendingEntryId === row.id} />
                  </Tooltip>
                </span>
              </Popconfirm>
              <Popconfirm
                title="确定审核不通过吗？"
                description="不通过后客户将被禁用，无法登录。"
                okText="不通过"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => reviewCustomer(row, 'reject')}
              >
                <span className="admin-row-action-trigger" onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="审核不通过" {...ADMIN_ACTION_TOOLTIP_PROPS}>
                    <Button type="text" size="small" danger icon={<CloseOutlined />} loading={pendingEntryId === row.id} />
                  </Tooltip>
                </span>
              </Popconfirm>
            </>
          ) : (
            <AdminEntityRowActions
              loading={pendingEntryId === row.id}
              isActive={row.status === 'active'}
              entityName="客户"
              showEdit={false}
              showDelete={false}
              onEdit={() => openDetail(row)}
              onToggleActive={() => toggleCustomerStatus(row)}
              onDelete={() => undefined}
              toggleActiveActionTitle="停用"
              toggleInactiveActionTitle="启用"
              toggleDisableDescription="停用后客户将无法登录前台。"
              toggleEnableDescription="启用后客户可恢复登录。"
              toggleDisableConfirmTitle="确定停用该客户吗？"
              toggleEnableConfirmTitle="确定启用该客户吗？"
            />
          )}
          <Popconfirm
            title="确定重置密码吗？"
            description="将生成 12 位临时密码，关闭弹窗后不可再次查看。"
            okText="重置"
            cancelText="取消"
            onConfirm={() => resetPasswordForCustomer(row)}
          >
            <span className="admin-row-action-trigger" onClick={(event) => event.stopPropagation()}>
              <Tooltip title="重置密码" {...ADMIN_ACTION_TOOLTIP_PROPS}>
                <Button type="text" size="small" icon={<KeyOutlined />} loading={pendingEntryId === row.id} />
              </Tooltip>
            </span>
          </Popconfirm>
        </Space>
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>客户管理</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            分页查看客户资料、审核注册、管理启停、站内信与收货地址。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建账户
        </Button>
      </Space>

      <Card>
        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="搜索姓名 / 邮箱 / 公司 / 电话"
            style={{ width: 260 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 120 }}
            value={query.status || undefined}
            options={userStatusOptions}
            onChange={(value) => applyQueryChange({ status: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="角色"
            style={{ width: 120 }}
            value={query.role || undefined}
            options={userRoleOptions}
            onChange={(value) => applyQueryChange({ role: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            showSearch
            placeholder="行业"
            style={{ width: 280 }}
            value={query.industry || undefined}
            options={customerIndustryFilterOptions}
            onChange={(value) => applyQueryChange({ industry: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            showSearch
            placeholder="国家"
            style={{ width: 280 }}
            value={query.country || undefined}
            options={countryOptions}
            onChange={(value) => applyQueryChange({ country: value ?? '', page: 1 })}
          />
          <Typography.Text type="secondary">共 {listState.total} 个账户</Typography.Text>
        </Space>

        <Table
          rowKey="id"
          dataSource={listState.items}
          columns={columns}
          pagination={false}
          scroll={adminTableScroll(1560)}
        />

        <AdminListPagination
          total={listState.total}
          page={listState.page}
          pageSize={listState.pageSize}
          disabled={isListLoading}
          onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
        />
      </Card>

      <CustomerDetailModal
        open={detailOpen}
        customerId={detailCustomerId}
        onClose={() => {
          setDetailOpen(false);
          setDetailCustomerId(null);
        }}
        onSaved={() => reloadList(query)}
      />

      <CustomerAddressesModal
        open={addressOpen}
        customerId={addressCustomer?.id ?? null}
        customerName={addressCustomer ? `${addressCustomer.firstName} ${addressCustomer.lastName}` : undefined}
        onClose={() => {
          setAddressOpen(false);
          setAddressCustomer(null);
        }}
      />

      <CustomerMessagesModal
        open={messageOpen}
        customerId={messageCustomer?.id ?? null}
        customerName={messageCustomer ? `${messageCustomer.firstName} ${messageCustomer.lastName}` : undefined}
        onClose={() => {
          setMessageOpen(false);
          setMessageCustomer(null);
        }}
        onSent={() => reloadList(query)}
      />

      <CustomerResetPasswordModal
        open={resetOpen}
        temporaryPassword={resetPassword}
        customerEmail={resetCustomerEmail}
        onClose={() => {
          setResetOpen(false);
          setResetPassword(null);
          setResetCustomerEmail(undefined);
        }}
      />

      <CustomerCreateModal
        open={createOpen}
        loading={isCreatePending}
        onClose={() => setCreateOpen(false)}
        onSubmit={createCustomer}
      />
    </Space>
  );
}
