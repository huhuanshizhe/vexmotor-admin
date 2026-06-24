'use client';

import { EyeInvisibleOutlined, PlusOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Image, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import {
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { confirmProductListingChange } from '@/lib/confirm-product-listing';
import {
  formatAdminMoney,
  productLifecycleColors,
  productLifecycleListLabels,
  productLifecycleListOptions,
  productStatusColors,
  productStatusLabels,
  purchaseModeColors,
  purchaseModeLabels,
} from '@/lib/admin-display';
import { buildAdminListRowIndexColumn, readStoredPageSize, writeStoredPageSize } from '@/lib/admin-list-query';
import { COMMON_CURRENCIES } from '@/lib/currencies';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import {
  type ProductListQuery,
  buildProductListUrl,
  parseProductListQuery,
} from '@/lib/product-list-query';
import type { AdminProductListItem, AdminProductTranslation } from '@/lib/product-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export type ProductListState = {
  items: AdminProductListItem[];
  total: number;
  activeCount: number;
  page: number;
  pageSize: ProductListQuery['pageSize'];
};

type ProductListClientProps = {
  initialList: ProductListState;
  initialQuery: ProductListQuery;
  activeLanguages: AdminSiteLanguageRow[];
  brandOptions: Array<{ label: string; value: string }>;
  categoryTree: AdminCategoryTreeNode[];
  renderEditorModal: (props: {
    open: boolean;
    editingEntry: AdminProductListItem | null;
    onClose: () => void;
    onSaved: (saved: AdminProductTranslation) => void;
  }) => ReactNode;
};

async function fetchProductList(query: ProductListQuery) {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.brandId) params.set('brand_id', query.brandId);
  if (query.categoryId) params.set('category_id', query.categoryId);
  if (query.purchaseMode) params.set('purchase_mode', query.purchaseMode);
  if (query.paidSample) params.set('paid_sample', query.paidSample);
  if (query.status) params.set('status', query.status);
  if (query.lifecycle) params.set('lifecycle', query.lifecycle);
  if (query.priceMin) params.set('price_min', query.priceMin);
  if (query.priceMax) params.set('price_max', query.priceMax);
  if (query.currency) params.set('currency', query.currency);
  if (query.locale) params.set('locale', query.locale);

  const response = await fetch(`/api/admin/products?${params.toString()}`);
  if (!response.ok) throw new Error('加载产品列表失败');

  const payload = (await response.json()) as {
    items: AdminProductListItem[];
    meta: { total: number; activeCount: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    activeCount: payload.meta.activeCount,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as ProductListQuery['pageSize'],
  };
}

export function ProductListClient({
  initialList,
  initialQuery,
  activeLanguages,
  brandOptions,
  categoryTree,
  renderEditorModal,
}: ProductListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<ProductListState>(initialList);
  const [query, setQuery] = useState<ProductListQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminProductListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const categoryOptions = useMemo(
    () => categoryTree.flatMap(function flatten(node): Array<{ label: string; value: string }> {
      return [{ label: node.name, value: node.id }, ...(node.children?.flatMap(flatten) ?? [])];
    }),
    [categoryTree],
  );

  const currencyOptions = useMemo(
    () => COMMON_CURRENCIES.map((currency) => ({ value: currency.code, label: currency.code })),
    [],
  );

  const replaceUrl = useCallback((nextQuery: ProductListQuery) => {
    router.replace(buildProductListUrl('/admin/products', nextQuery), { scroll: false });
  }, [router]);

  useEffect(() => {
    if (hydratedPageSizeRef.current) return;
    hydratedPageSizeRef.current = true;
    const stored = readStoredPageSize();
    if (!searchParams.get('page_size') && stored && stored !== initialQuery.pageSize) {
      replaceUrl({ ...initialQuery, pageSize: stored, page: 1 });
    }
  }, [searchParams, initialQuery, replaceUrl]);

  const reloadList = useCallback((nextQuery: ProductListQuery) => {
    startTransition(async () => {
      try {
        const result = await fetchProductList(nextQuery);
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载产品列表失败');
      }
    });
  }, [messageApi]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const urlQuery = parseProductListQuery(
      Object.fromEntries(searchParams.entries()),
      { storedPageSize: readStoredPageSize() },
    );
    if (searchParams.get('page_size')) writeStoredPageSize(urlQuery.pageSize);
    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<ProductListQuery>) {
    const nextQuery: ProductListQuery = {
      ...query,
      ...patch,
      page: patch.page ?? 1,
    };
    if (patch.pageSize) writeStoredPageSize(patch.pageSize);
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  function openEditor(entry?: AdminProductListItem) {
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

  function handleSaved(saved: AdminProductTranslation) {
    void (async () => {
      const response = await fetch(`/api/admin/products/${saved.productId}`);
      if (response.ok) {
        const payload = (await response.json()) as { item: AdminProductListItem };
        setEditingEntry(payload.item);
      }
      reloadList(query);
    })();
  }

  function patchProductStatus(entry: AdminProductListItem, nextStatus: 'active' | 'inactive') {
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }
      void messageApi.success(`产品已${productStatusLabels[nextStatus]}`);
      reloadList(query);
    });
  }

  function deleteProduct(entry: AdminProductListItem) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        void messageApi.error('删除失败');
        return;
      }
      void messageApi.success('产品已删除');
      reloadList(query);
    });
  }

  const columns: ColumnsType<AdminProductListItem> = [
    buildAdminListRowIndexColumn(query.page, query.pageSize),
    {
      title: '封面',
      dataIndex: 'coverUrl',
      width: 72,
      render: (value: string | null) => value
        ? <Image src={value} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} preview={{ mask: '预览' }} />
        : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      ellipsis: true,
      ...adminTableNowrapHeader(),
    },
    { title: 'SKU', dataIndex: 'sku', width: 140, ...adminTableNowrapHeader() },
    {
      title: '购买模式',
      dataIndex: 'purchaseMode',
      width: 110,
      render: (value: keyof typeof purchaseModeLabels) => (
        <Tag color={purchaseModeColors[value]}>{purchaseModeLabels[value]}</Tag>
      ),
    },
    { title: '默认库存', dataIndex: 'stockQuantity', width: 100, align: 'right' as const },
    {
      title: '销售价',
      key: 'price',
      width: 130,
      render: (_: unknown, row: AdminProductListItem) => formatAdminMoney(row.price, row.currencyCode),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: keyof typeof productStatusLabels) => (
        <Tag color={productStatusColors[value]}>{productStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '生命周期',
      dataIndex: 'lifecycleStatus',
      width: 110,
      render: (value: keyof typeof productLifecycleListLabels) => (
        <Tag color={productLifecycleColors[value]}>{productLifecycleListLabels[value]}</Tag>
      ),
    },
    adminTableFixedActionsColumn<AdminProductListItem>({
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, row: AdminProductListItem) => (
        <AdminEntityRowActions
          entityName="产品"
          isActive={row.status === 'active'}
          toggleUsePopconfirm={false}
          onEdit={() => openEditor(row)}
          onToggleActive={() => {
            const nextStatus = row.status === 'active' ? 'inactive' : 'active';
            confirmProductListingChange(nextStatus, () => patchProductStatus(row, nextStatus));
          }}
          onDelete={() => deleteProduct(row)}
          toggleActiveActionTitle="下架"
          toggleInactiveActionTitle="上架"
          toggleActiveActionIcon={<EyeInvisibleOutlined />}
          toggleInactiveActionIcon={<ShoppingOutlined />}
        />
      ),
    }),
  ];

  return (
    <>
      {contextHolder}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <AdminPageHeaderStats
            items={[
              { label: '产品总量', value: listState.total },
              { label: '已上架', value: listState.activeCount },
              { label: '当前页', value: listState.items.length },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
            新建产品
          </Button>
        </div>

        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="搜索名称 / SKU / Slug"
            style={{ width: 240 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
          />
          <Select
            allowClear
            placeholder="品牌"
            style={{ width: 160 }}
            value={query.brandId || undefined}
            options={brandOptions}
            onChange={(value) => applyQueryChange({ brandId: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            showSearch
            placeholder="分类"
            style={{ width: 180 }}
            value={query.categoryId || undefined}
            options={categoryOptions}
            onChange={(value) => applyQueryChange({ categoryId: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="购买模式"
            style={{ width: 130 }}
            value={query.purchaseMode || undefined}
            options={[{ value: 'buy', label: '直接下单' }, { value: 'inquiry', label: '询价模式' }]}
            onChange={(value) => applyQueryChange({ purchaseMode: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="付邮拿样"
            style={{ width: 120 }}
            value={query.paidSample || undefined}
            options={[{ value: 'true', label: '是' }, { value: 'false', label: '否' }]}
            onChange={(value) => applyQueryChange({ paidSample: value ?? '', page: 1 })}
          />
          <InputNumber
            placeholder="最低价"
            style={{ width: 110 }}
            value={query.priceMin ? Number(query.priceMin) : undefined}
            onChange={(value) => applyQueryChange({ priceMin: value == null ? '' : String(value), page: 1 })}
          />
          <InputNumber
            placeholder="最高价"
            style={{ width: 110 }}
            value={query.priceMax ? Number(query.priceMax) : undefined}
            onChange={(value) => applyQueryChange({ priceMax: value == null ? '' : String(value), page: 1 })}
          />
          <Select
            allowClear
            placeholder="币种"
            style={{ width: 100 }}
            value={query.currency || undefined}
            options={currencyOptions}
            onChange={(value) => applyQueryChange({ currency: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 110 }}
            value={query.status || undefined}
            options={[{ value: 'active', label: '上架' }, { value: 'inactive', label: '下架' }]}
            onChange={(value) => applyQueryChange({ status: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="生命周期"
            style={{ width: 130 }}
            value={query.lifecycle || undefined}
            options={productLifecycleListOptions}
            onChange={(value) => applyQueryChange({ lifecycle: value ?? '', page: 1 })}
          />
          <Select
            allowClear
            placeholder="展示语言"
            style={{ width: 130 }}
            value={query.locale || undefined}
            options={activeLanguages.map((language) => ({ value: language.code, label: language.nativeName }))}
            onChange={(value) => applyQueryChange({ locale: value ?? '', page: 1 })}
          />
        </Space>

        <Table
          rowKey="id"
          loading={isPending}
          columns={columns}
          dataSource={listState.items}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无产品" /> }}
          scroll={adminTableScroll(1200)}
        />

        <AdminListPagination
          page={query.page}
          pageSize={query.pageSize}
          total={listState.total}
          onChange={(next) => applyQueryChange(next)}
        />
      </Card>

      {!activeLanguages.length ? (
        <Empty description="尚未配置站点语言">
          <Link href="/admin/languages"><Button type="primary">前往多语言管理</Button></Link>
        </Empty>
      ) : null}

      {renderEditorModal({
        open: editorOpen,
        editingEntry,
        onClose: closeEditor,
        onSaved: handleSaved,
      })}
    </>
  );
}
