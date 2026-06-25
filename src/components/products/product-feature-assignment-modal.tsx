'use client';

import { FormOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { ADMIN_ACTION_TOOLTIP_PROPS, AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableNowrapHeader } from '@/components/admin/admin-table';
import { ProductFeatureValueModal } from '@/components/products/product-feature-value-modal';
import { brandStatusColors, brandStatusLabels } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import { featureValueTypeLabels } from '@/lib/feature-definition-content';
import type { AdminProductFeatureAssignmentListItem } from '@/lib/product-feature-content';
import type { AdminProductListItem } from '@/lib/product-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type AvailableDefinition = {
  id: string;
  key: string;
  name: string;
  valueType: AdminProductFeatureAssignmentListItem['valueType'];
};

type ProductFeatureAssignmentModalProps = {
  open: boolean;
  product: AdminProductListItem | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onChanged: () => void;
};

export function ProductFeatureAssignmentModal({
  open,
  product,
  activeLanguages,
  onClose,
  onChanged,
}: ProductFeatureAssignmentModalProps) {
  const [items, setItems] = useState<AdminProductFeatureAssignmentListItem[]>([]);
  const [available, setAvailable] = useState<AvailableDefinition[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>();
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AdminProductFeatureAssignmentListItem | null>(null);
  const [initialValueId, setInitialValueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const loadAssignments = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}/feature-assignments`);
      if (!response.ok) throw new Error('load failed');
      const payload = (await response.json()) as {
        items: AdminProductFeatureAssignmentListItem[];
        available: AvailableDefinition[];
      };
      setItems(payload.items);
      setAvailable(payload.available);
    } catch {
      void messageApi.error('加载产品特性失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi, product]);

  useEffect(() => {
    if (!open || !product) {
      setItems([]);
      setAvailable([]);
      setKeyword('');
      setSelectedDefinitionId(undefined);
      setValueModalOpen(false);
      setEditingAssignment(null);
      setInitialValueId(null);
      return;
    }
    void loadAssignments();
  }, [open, product, loadAssignments]);

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(query)
      || item.key.toLowerCase().includes(query),
    );
  }, [items, keyword]);

  function addAssignment() {
    if (!product || !selectedDefinitionId) {
      void messageApi.warning('请选择要添加的特性');
      return;
    }
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${product.id}/feature-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definitionId: selectedDefinitionId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        void messageApi.error(payload?.message ?? '添加特性失败');
        return;
      }
      setSelectedDefinitionId(undefined);
      await loadAssignments();
      onChanged();
      void messageApi.success('特性已添加');
    });
  }

  function patchAssignmentStatus(row: AdminProductFeatureAssignmentListItem, nextStatus: 'active' | 'inactive') {
    if (!product) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${product.id}/feature-assignments/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }
      await loadAssignments();
      onChanged();
      void messageApi.success(`特性已${brandStatusLabels[nextStatus]}`);
    });
  }

  function deleteAssignment(row: AdminProductFeatureAssignmentListItem) {
    if (!product) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${product.id}/feature-assignments/${row.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        void messageApi.error('删除失败');
        return;
      }
      await loadAssignments();
      onChanged();
      void messageApi.success('特性已删除');
    });
  }

  function openValueEditor(row: AdminProductFeatureAssignmentListItem, valueId?: string) {
    setEditingAssignment(row);
    setInitialValueId(valueId ?? null);
    setValueModalOpen(true);
  }

  function closeValueEditor() {
    setValueModalOpen(false);
    setEditingAssignment(null);
    setInitialValueId(null);
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={product ? `产品特性 · ${product.name}` : '产品特性'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1200}
        destroyOnHidden
        className="content-editor-modal product-feature-assignment-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input.Search
              allowClear
              placeholder="筛选特性名称或 Key"
              style={{ width: 280 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Space wrap>
              <Select
                showSearch
                allowClear
                placeholder="选择特性定义"
                style={{ width: 260 }}
                value={selectedDefinitionId}
                onChange={setSelectedDefinitionId}
                options={available.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.key})`,
                }))}
                optionFilterProp="label"
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={isPending}
                disabled={!available.length}
                onClick={() => addAssignment()}
              >
                添加特性
              </Button>
            </Space>
          </Space>

          <Table
            rowKey="id"
            loading={loading || isPending}
            pagination={false}
            dataSource={filteredItems}
            columns={[
              buildAdminListRowIndexColumn(1, Math.max(filteredItems.length, 1)),
              {
                title: '特性名称',
                dataIndex: 'name',
                width: 140,
                ellipsis: true,
                onHeaderCell: adminTableNowrapHeader,
              },
              {
                title: 'Key',
                dataIndex: 'key',
                width: 120,
                onHeaderCell: adminTableNowrapHeader,
                render: (value: string) => <Tag>{value}</Tag>,
              },
              {
                title: '特性值类型',
                dataIndex: 'valueType',
                width: 100,
                onHeaderCell: adminTableNowrapHeader,
                render: (value: AdminProductFeatureAssignmentListItem['valueType']) => (
                  <Tag color="blue">{featureValueTypeLabels[value]}</Tag>
                ),
              },
              {
                title: '特性值',
                key: 'values',
                width: 220,
                onHeaderCell: adminTableNowrapHeader,
                render: (_: unknown, row: AdminProductFeatureAssignmentListItem) => (
                  <div className="product-feature-assignment-values">
                    <Tooltip title="编辑特性值" {...ADMIN_ACTION_TOOLTIP_PROPS}>
                      <button
                        type="button"
                        className="admin-count-hotzone product-feature-assignment-values__toolbar"
                        aria-label="编辑特性值"
                        onClick={() => openValueEditor(row)}
                      >
                        <span className="admin-count-hotzone__icon"><FormOutlined /></span>
                        <span className="admin-count-hotzone__count">({row.valueCount})</span>
                      </button>
                    </Tooltip>
                    {row.values.length ? (
                      <div className="product-feature-assignment-values__list">
                        {row.values.map((value) => {
                          const isEmpty = value.displayValue === '—';
                          return (
                            <button
                              key={value.id}
                              type="button"
                              className={`product-feature-assignment-values__chip${isEmpty ? ' is-empty' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openValueEditor(row, value.id);
                              }}
                            >
                              <span className="product-feature-assignment-values__chip-text">
                                {isEmpty ? '未填写' : value.displayValue}
                              </span>
                              {!isEmpty && value.displayUnit ? (
                                <span className="product-feature-assignment-values__chip-unit">{value.displayUnit}</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Typography.Text type="secondary" className="product-feature-assignment-values__empty">
                        暂无值
                      </Typography.Text>
                    )}
                  </div>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 80,
                onHeaderCell: adminTableNowrapHeader,
                render: (value: AdminProductFeatureAssignmentListItem['status']) => (
                  <Tag color={brandStatusColors[value]}>{brandStatusLabels[value]}</Tag>
                ),
              },
              {
                title: '操作',
                key: 'actions',
                width: 100,
                render: (_: unknown, row: AdminProductFeatureAssignmentListItem) => (
                  <AdminEntityRowActions
                    loading={isPending}
                    isActive={row.status === 'active'}
                    entityName="特性"
                    showEdit={false}
                    onEdit={() => openValueEditor(row)}
                    onToggleActive={() => patchAssignmentStatus(row, row.status === 'active' ? 'inactive' : 'active')}
                    onDelete={() => deleteAssignment(row)}
                  />
                ),
              },
            ]}
            locale={{ emptyText: '尚未添加特性，请从上方选择特性定义后添加' }}
          />
        </Space>
      </Modal>

      <ProductFeatureValueModal
        open={valueModalOpen}
        productId={product?.id ?? ''}
        assignment={editingAssignment}
        initialValueId={initialValueId}
        activeLanguages={activeLanguages}
        onClose={closeValueEditor}
        onChanged={() => {
          void loadAssignments();
          onChanged();
        }}
      />
    </>
  );
}
