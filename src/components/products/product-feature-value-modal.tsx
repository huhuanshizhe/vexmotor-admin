'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableNowrapHeader } from '@/components/admin/admin-table';
import { ProductFeatureValueLocalePanel } from '@/components/products/product-feature-value-locale-panel';
import { brandStatusColors, brandStatusLabels } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type {
  AdminProductFeatureAssignmentListItem,
  AdminProductFeatureValueDetail,
  AdminProductFeatureValueListItem,
} from '@/lib/product-feature-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type ProductFeatureValueModalProps = {
  open: boolean;
  productId: string;
  assignment: AdminProductFeatureAssignmentListItem | null;
  initialValueId?: string | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onChanged: () => void;
};

export function ProductFeatureValueModal({
  open,
  productId,
  assignment,
  initialValueId = null,
  activeLanguages,
  onClose,
  onChanged,
}: ProductFeatureValueModalProps) {
  const [items, setItems] = useState<AdminProductFeatureValueListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminProductFeatureValueDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const loadValues = useCallback(async () => {
    if (!assignment) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/feature-assignments/${assignment.id}/values`);
      if (!response.ok) throw new Error('load failed');
      const payload = (await response.json()) as { items: AdminProductFeatureValueListItem[] };
      setItems(payload.items);
    } catch {
      void messageApi.error('加载特性值失败');
    } finally {
      setLoading(false);
    }
  }, [assignment, messageApi, productId]);

  const loadDetail = useCallback(async (valueId: string) => {
    if (!assignment) return;
    const response = await fetch(
      `/api/admin/products/${productId}/feature-assignments/${assignment.id}/values/${valueId}`,
    );
    if (!response.ok) {
      void messageApi.error('加载特性值详情失败');
      return;
    }
    const payload = (await response.json()) as AdminProductFeatureValueDetail;
    setDetail(payload);
  }, [assignment, messageApi, productId]);

  useEffect(() => {
    if (!open || !assignment) {
      setItems([]);
      setKeyword('');
      setSelectedValueId(null);
      setDetail(null);
      return;
    }
    void loadValues();
  }, [open, assignment, loadValues]);

  useEffect(() => {
    if (!open || !assignment) return;
    if (initialValueId && items.some((item) => item.id === initialValueId)) {
      setSelectedValueId(initialValueId);
      return;
    }
    if (!initialValueId) {
      setSelectedValueId(null);
    }
  }, [open, assignment, initialValueId, items]);

  useEffect(() => {
    if (!open || !selectedValueId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedValueId);
  }, [open, selectedValueId, loadDetail]);

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.displayValue.toLowerCase().includes(query)
      || (item.displayUnit ?? '').toLowerCase().includes(query),
    );
  }, [items, keyword]);

  function createValue() {
    if (!assignment) return;
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/products/${productId}/feature-assignments/${assignment.id}/values`,
        { method: 'POST' },
      );
      if (!response.ok) {
        void messageApi.error('新建特性值失败');
        return;
      }
      const created = (await response.json()) as AdminProductFeatureValueListItem;
      await loadValues();
      setSelectedValueId(created.id);
      onChanged();
      void messageApi.success('已新建特性值');
    });
  }

  function patchValueStatus(row: AdminProductFeatureValueListItem, nextStatus: 'active' | 'inactive') {
    if (!assignment) return;
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/products/${productId}/feature-assignments/${assignment.id}/values/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }
      await loadValues();
      onChanged();
      void messageApi.success(`特性值已${brandStatusLabels[nextStatus]}`);
    });
  }

  function deleteValue(row: AdminProductFeatureValueListItem) {
    if (!assignment) return;
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/products/${productId}/feature-assignments/${assignment.id}/values/${row.id}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        void messageApi.error('删除失败');
        return;
      }
      if (selectedValueId === row.id) {
        setSelectedValueId(null);
        setDetail(null);
      }
      await loadValues();
      onChanged();
      void messageApi.success('特性值已删除');
    });
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={assignment ? `特性值 · ${assignment.name}` : '特性值'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        destroyOnHidden
        className="content-editor-modal product-feature-value-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Input.Search
              allowClear
              placeholder="筛选值"
              style={{ width: 280 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} loading={isPending} onClick={() => createValue()}>
              新建值
            </Button>
          </Space>

          <Table
            rowKey="id"
            loading={loading || isPending}
            pagination={false}
            dataSource={filteredItems}
            onRow={(row) => ({
              onClick: () => setSelectedValueId(row.id),
              style: {
                cursor: 'pointer',
                background: row.id === selectedValueId ? 'rgba(255, 126, 0, 0.08)' : undefined,
              },
            })}
            columns={[
              buildAdminListRowIndexColumn(1, Math.max(filteredItems.length, 1)),
              {
                title: '值',
                dataIndex: 'displayValue',
                ellipsis: true,
                onHeaderCell: adminTableNowrapHeader,
              },
              {
                title: '值单位',
                dataIndex: 'displayUnit',
                width: 100,
                onHeaderCell: adminTableNowrapHeader,
                render: (value: string | null) => (
                  <Typography.Text type={value ? undefined : 'secondary'}>
                    {value ?? '—'}
                  </Typography.Text>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 88,
                onHeaderCell: adminTableNowrapHeader,
                render: (value: AdminProductFeatureValueListItem['status']) => (
                  <Tag color={brandStatusColors[value]}>{brandStatusLabels[value]}</Tag>
                ),
              },
              {
                title: '操作',
                key: 'actions',
                width: 100,
                render: (_: unknown, row: AdminProductFeatureValueListItem) => (
                  <div onClick={(event) => event.stopPropagation()}>
                    <AdminEntityRowActions
                      loading={isPending}
                      isActive={row.status === 'active'}
                      entityName="特性值"
                      showEdit={false}
                      onEdit={() => setSelectedValueId(row.id)}
                      onToggleActive={() => patchValueStatus(row, row.status === 'active' ? 'inactive' : 'active')}
                      onDelete={() => deleteValue(row)}
                    />
                  </div>
                ),
              },
            ]}
            locale={{ emptyText: '暂无特性值，点击「新建值」添加' }}
          />

          {selectedValueId && detail && assignment ? (
            <ProductFeatureValueLocalePanel
              productId={productId}
              assignmentId={assignment.id}
              valueId={selectedValueId}
              detail={detail}
              activeLanguages={activeLanguages}
              onSaved={(saved) => {
                setDetail(saved);
                void loadValues();
                onChanged();
              }}
            />
          ) : (
            <Typography.Text type="secondary">点击列表行以编辑该特性值的多语言内容</Typography.Text>
          )}
        </Space>
      </Modal>
    </>
  );
}
