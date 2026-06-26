'use client';

import { Avatar, Input, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type BrandPickerItem,
  buildBrandPickerQueryString,
} from '@/lib/brand-picker';

type BrandPickerModalProps = {
  open: boolean;
  mode: 'single' | 'multiple';
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[], items: BrandPickerItem[]) => void;
};

const PAGE_SIZE = 50;
const SCROLL_Y = 360;
const SELECTION_COLUMN_WIDTH = 48;
const BRAND_LIST_COLUMN_WIDTH = 488;
const TABLE_SCROLL_X = SELECTION_COLUMN_WIDTH + BRAND_LIST_COLUMN_WIDTH;

async function fetchBrandPickerPage(params: {
  keyword: string;
  page: number;
}): Promise<{ items: BrandPickerItem[]; total: number }> {
  const response = await fetch(`/api/admin/brands/picker${buildBrandPickerQueryString({
    keyword: params.keyword,
    page: params.page,
    pageSize: PAGE_SIZE,
  })}`);
  if (!response.ok) throw new Error('加载品牌失败');
  const payload = (await response.json()) as {
    items: BrandPickerItem[];
    meta: { total: number };
  };
  return { items: payload.items, total: payload.meta.total };
}

export function BrandPickerModal({
  open,
  mode,
  disabledIds = new Set(),
  onCancel,
  onConfirm,
}: BrandPickerModalProps) {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [items, setItems] = useState<BrandPickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword, open]);

  const loadPage = useCallback(async (nextPage: number, search: string, append: boolean) => {
    setLoading(true);
    loadingMoreRef.current = true;
    try {
      const result = await fetchBrandPickerPage({ keyword: search, page: nextPage });
      setTotal(result.total);
      setPage(nextPage);
      setItems((current) => (append ? [...current, ...result.items] : result.items));
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setKeyword('');
    setDebouncedKeyword('');
    setPendingKeys([]);
    setItems([]);
    setTotal(0);
    setPage(1);
    void loadPage(1, '', false);
  }, [open, loadPage]);

  useEffect(() => {
    if (!open) return;
    void loadPage(1, debouncedKeyword, false);
  }, [debouncedKeyword, loadPage, open]);

  const columns = useMemo<ColumnsType<BrandPickerItem>>(() => [
    {
      title: '品牌',
      key: 'brand',
      width: BRAND_LIST_COLUMN_WIDTH,
      render: (_: unknown, row: BrandPickerItem) => (
        <div className="brand-picker-row">
          <Avatar
            shape="square"
            size={24}
            src={row.logoUrl ?? undefined}
            className="brand-picker-row__logo"
          >
            {row.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="brand-picker-row__body">
            <div className="brand-picker-row__name">{row.name}</div>
            <div className="brand-picker-row__meta">
              {row.slug ? `${row.slug} · ` : ''}{row.productCount} 个商品
            </div>
          </div>
        </div>
      ),
    },
  ], []);

  const hasActiveFilter = debouncedKeyword.length > 0;

  const rowSelection = useMemo<TableRowSelection<BrandPickerItem>>(() => ({
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
    void loadPage(page + 1, debouncedKeyword, true);
  }

  return (
    <Modal
      title="选择品牌"
      open={open}
      width={560}
      destroyOnHidden
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => {
        const itemMap = new Map(items.map((row) => [row.id, row]));
        const selectedItems = pendingKeys
          .map((id) => itemMap.get(id))
          .filter((row): row is BrandPickerItem => Boolean(row));
        onConfirm(pendingKeys, selectedItems);
      }}
      okButtonProps={{ disabled: pendingKeys.length === 0 }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <Input
          allowClear
          placeholder="搜索品牌名称 / slug"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Table<BrandPickerItem>
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
          locale={{ emptyText: debouncedKeyword ? '未找到匹配的品牌' : '暂无品牌' }}
        />
        <Typography.Text type="secondary">
          已勾选 {pendingKeys.length} 项 · 已加载 {items.length} / 共 {total} 条
          {mode === 'multiple' && disabledIds.size ? `（表单中已有 ${disabledIds.size} 项不可重复）` : ''}
        </Typography.Text>
      </div>
    </Modal>
  );
}
