'use client';

import { Avatar, Input, Modal, Select, Table, Tag, TreeSelect, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { buildCategoryParentTreeSelectData } from '@/lib/category-parent-tree-select';
import {
  formatAdminMoney,
  productStatusColors,
  productStatusLabels,
} from '@/lib/admin-display';
import {
  type BrandPickerItem,
  buildBrandPickerQueryString,
} from '@/lib/brand-picker';
import {
  type ProductPickerItem,
  buildProductPickerQueryString,
} from '@/lib/product-picker';

type ProductPickerModalProps = {
  open: boolean;
  mode: 'single' | 'multiple';
  categoryTree: AdminCategoryTreeNode[];
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[], items: ProductPickerItem[]) => void;
};

const PAGE_SIZE = 50;
const SCROLL_Y = 400;
const SELECTION_COLUMN_WIDTH = 48;
const PRODUCT_COLUMN_WIDTH = 280;
const PRICE_COLUMN_WIDTH = 110;
const STATUS_COLUMN_WIDTH = 72;
const TABLE_SCROLL_X = SELECTION_COLUMN_WIDTH + PRODUCT_COLUMN_WIDTH + PRICE_COLUMN_WIDTH + STATUS_COLUMN_WIDTH;

async function fetchProductPickerPage(params: {
  keyword: string;
  brandId: string;
  categoryId: string;
  page: number;
}): Promise<{ items: ProductPickerItem[]; total: number }> {
  const response = await fetch(`/api/admin/products/picker${buildProductPickerQueryString({
    keyword: params.keyword,
    brandId: params.brandId || undefined,
    categoryId: params.categoryId || undefined,
    page: params.page,
    pageSize: PAGE_SIZE,
  })}`);
  if (!response.ok) throw new Error('加载商品失败');
  const payload = (await response.json()) as {
    items: ProductPickerItem[];
    meta: { total: number };
  };
  return { items: payload.items, total: payload.meta.total };
}

async function fetchBrandFilterOptions(keyword: string): Promise<BrandPickerItem[]> {
  const response = await fetch(`/api/admin/brands/picker${buildBrandPickerQueryString({
    keyword,
    page: 1,
    pageSize: 100,
  })}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { items: BrandPickerItem[] };
  return payload.items ?? [];
}

export function ProductPickerModal({
  open,
  mode,
  categoryTree,
  disabledIds = new Set(),
  onCancel,
  onConfirm,
}: ProductPickerModalProps) {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [brandId, setBrandId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [brandOptions, setBrandOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [items, setItems] = useState<ProductPickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);

  const categoryTreeData = useMemo(
    () => buildCategoryParentTreeSelectData(categoryTree, new Set()),
    [categoryTree],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword, open]);

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    setLoading(true);
    loadingMoreRef.current = true;
    try {
      const result = await fetchProductPickerPage({
        keyword: debouncedKeyword,
        brandId: brandId ?? '',
        categoryId: categoryId ?? '',
        page: nextPage,
      });
      setTotal(result.total);
      setPage(nextPage);
      setItems((current) => (append ? [...current, ...result.items] : result.items));
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [brandId, categoryId, debouncedKeyword]);

  useEffect(() => {
    if (!open) return;
    setKeyword('');
    setDebouncedKeyword('');
    setBrandId(undefined);
    setCategoryId(undefined);
    setPendingKeys([]);
    setItems([]);
    setTotal(0);
    setPage(1);
    setBrandLoading(true);
    void fetchBrandFilterOptions('').then((rows) => {
      setBrandOptions(rows.map((row) => ({ value: row.id, label: row.name })));
    }).finally(() => setBrandLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadPage(1, false);
  }, [debouncedKeyword, brandId, categoryId, loadPage, open]);

  const columns = useMemo<ColumnsType<ProductPickerItem>>(() => [
    {
      title: '商品',
      key: 'product',
      width: PRODUCT_COLUMN_WIDTH,
      render: (_: unknown, row: ProductPickerItem) => (
        <div className="product-picker-row">
          <Avatar
            shape="square"
            size={40}
            src={row.coverUrl ?? undefined}
            className="product-picker-row__cover"
          >
            {row.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="product-picker-row__body">
            <div className="product-picker-row__name">{row.name}</div>
            <div className="product-picker-row__spu">{row.spu}</div>
            <div className="product-picker-row__meta">
              {[row.brandName, row.categoryName].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '价格',
      key: 'price',
      width: PRICE_COLUMN_WIDTH,
      render: (_: unknown, row: ProductPickerItem) => (
        <Typography.Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
          {formatAdminMoney(Number(row.price), row.currencyCode)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: STATUS_COLUMN_WIDTH,
      render: (value: keyof typeof productStatusLabels) => (
        <Tag color={productStatusColors[value]}>{productStatusLabels[value]}</Tag>
      ),
    },
  ], []);

  const hasActiveFilter = Boolean(debouncedKeyword || brandId || categoryId);

  const rowSelection = useMemo<TableRowSelection<ProductPickerItem>>(() => ({
    type: mode === 'single' ? 'radio' : 'checkbox',
    columnWidth: SELECTION_COLUMN_WIDTH,
    hideSelectAll: mode === 'single' || !hasActiveFilter,
    selectedRowKeys: pendingKeys,
    getCheckboxProps: (row) => ({
      disabled: disabledIds.has(row.id),
    }),
    onChange: (keys) => {
      const nextKeys = keys.map(String);
      if (mode === 'single') {
        setPendingKeys(nextKeys.length ? [nextKeys[nextKeys.length - 1]!] : []);
        return;
      }
      setPendingKeys(nextKeys);
    },
  }), [disabledIds, hasActiveFilter, mode, pendingKeys]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 48;
    if (!nearBottom || loading || loadingMoreRef.current) return;
    if (items.length >= total) return;
    void loadPage(page + 1, true);
  }

  const emptyText = debouncedKeyword || brandId || categoryId
    ? '未找到匹配的商品'
    : '暂无商品，可尝试搜索或筛选';

  return (
    <Modal
      title="选择商品"
      open={open}
      width={1080}
      destroyOnHidden
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => {
        const itemMap = new Map(items.map((row) => [row.id, row]));
        const selectedItems = pendingKeys
          .map((id) => itemMap.get(id))
          .filter((row): row is ProductPickerItem => Boolean(row));
        onConfirm(pendingKeys, selectedItems);
      }}
      okButtonProps={{ disabled: pendingKeys.length === 0 }}
      className="product-picker-modal"
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="product-picker-modal__filters">
          <Input
            allowClear
            placeholder="搜索名称 / SPU"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            allowClear
            showSearch
            placeholder="品牌"
            className="product-picker-modal__brand-filter"
            value={brandId}
            loading={brandLoading}
            options={brandOptions}
            optionFilterProp="label"
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 320 }}
            onSearch={(value) => {
              setBrandLoading(true);
              void fetchBrandFilterOptions(value).then((rows) => {
                setBrandOptions(rows.map((row) => ({ value: row.id, label: row.name })));
              }).finally(() => setBrandLoading(false));
            }}
            onChange={(value) => setBrandId(value)}
          />
          <TreeSelect
            allowClear
            showSearch
            placeholder="分类"
            className="product-picker-modal__category-filter"
            treeData={categoryTreeData}
            treeNodeFilterProp="title"
            value={categoryId}
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 360 }}
            listHeight={400}
            onChange={(value) => setCategoryId(value)}
          />
        </div>

        <Table<ProductPickerItem>
          className="entity-picker-table"
          rowKey="id"
          size="small"
          tableLayout="fixed"
          pagination={false}
          loading={loading && page === 1}
          columns={columns}
          dataSource={items}
          rowSelection={rowSelection}
          virtual
          scroll={{ x: TABLE_SCROLL_X, y: SCROLL_Y }}
          onScroll={handleScroll}
          locale={{ emptyText }}
        />

        <Typography.Text type="secondary">
          已勾选 {pendingKeys.length} 项 · 已加载 {items.length} / 共 {total} 条
          {mode === 'multiple' && disabledIds.size ? `（表单中已有 ${disabledIds.size} 项不可重复）` : ''}
        </Typography.Text>
      </div>
    </Modal>
  );
}
