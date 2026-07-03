'use client';

import { GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, InputNumber, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn } from '@/components/admin/admin-table';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CommerceSettingsForm } from '@/components/commerce/commerce-settings-form';
import type { CommerceSettingsFormValues } from '@/components/commerce/commerce-settings-form';
import { ShippingCountryRatesModal } from '@/components/commerce/shipping-country-rates-modal';
import { ShippingMethodEditorModal } from '@/components/commerce/shipping-method-editor-modal';
import { ratesForShippingMethod } from '@/components/commerce/commerce-utils';
import { useCommerceConfig } from '@/components/commerce/use-commerce-config';
import { ADMIN_ACTION_TOOLTIP_PROPS } from '@/components/admin/admin-row-actions';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { CommerceConfig } from '@/lib/commerce-config';
import { getShippingRateChipLabel } from '@/lib/commerce-shipping-rate';
import type { AdminShippingMethodListItem } from '@/lib/shipping-method-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type ShippingMethodsClientProps = {
  initialConfig: CommerceConfig;
  initialMethods: AdminShippingMethodListItem[];
  activeLanguages: AdminSiteLanguageRow[];
  defaultLocale: string;
};

function toRateModalMethod(method: AdminShippingMethodListItem) {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    etaLabel: method.etaLabel,
    note: method.note,
    enabled: method.enabled,
    sortOrder: method.sortOrder,
  };
}

export function ShippingMethodsClient({
  initialConfig,
  initialMethods,
  activeLanguages,
  defaultLocale,
}: ShippingMethodsClientProps) {
  const { config, isPending, updateConfig, persistConfig } = useCommerceConfig(initialConfig);
  const [methods, setMethods] = useState(initialMethods);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminShippingMethodListItem | null>(null);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ReturnType<typeof toRateModalMethod> | null>(null);
  const [initialRateId, setInitialRateId] = useState<string | null>(null);

  const sortedMethods = useMemo(
    () => [...methods].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [methods],
  );

  async function reloadMethods() {
    const response = await fetch('/api/admin/shipping-methods', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as { items: AdminShippingMethodListItem[] };
    setMethods(payload.items ?? []);
    const commerceResponse = await fetch('/api/admin/commerce', { cache: 'no-store' });
    if (commerceResponse.ok) {
      const commerceConfig = (await commerceResponse.json()) as CommerceConfig;
      updateConfig(() => commerceConfig);
    }
  }

  function handleSettingsChange(changedValues: Partial<CommerceSettingsFormValues>) {
    updateConfig((current) => ({
      ...current,
      defaultShippingMethodCode: changedValues.defaultShippingMethodCode ?? current.defaultShippingMethodCode,
    }));
  }

  function openEditor(method?: AdminShippingMethodListItem) {
    setEditingEntry(method ?? null);
    setEditorOpen(true);
  }

  function openRatesModal(method: AdminShippingMethodListItem, rateId?: string) {
    setEditingMethod(toRateModalMethod(method));
    setInitialRateId(rateId ?? null);
    setRatesModalOpen(true);
  }

  function closeRatesModal() {
    setRatesModalOpen(false);
    setEditingMethod(null);
    setInitialRateId(null);
  }

  async function patchMethodEnabled(row: AdminShippingMethodListItem, enabled: boolean) {
    const response = await fetch(`/api/admin/shipping-methods/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) {
      void message.error('状态更新失败');
      return;
    }
    await reloadMethods();
    void message.success('已更新状态');
  }

  async function patchMethodSortOrder(id: string, sortOrder: number | null) {
    if (sortOrder == null) return;
    const response = await fetch(`/api/admin/shipping-methods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sortOrder }),
    });
    if (!response.ok) {
      void message.error('排序更新失败');
      return;
    }
    await reloadMethods();
  }

  async function deleteShippingMethod(id: string) {
    const response = await fetch(`/api/admin/shipping-methods/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      void message.error(payload.message ?? '删除失败');
      return;
    }
    await reloadMethods();
    void message.success('已删除');
  }

  const configWithMethods = useMemo(() => ({
    ...config,
    shippingMethods: sortedMethods.map(toRateModalMethod),
  }), [config, sortedMethods]);

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="物流方式"
        description="维护国际物流方式及各国运费与税率估算。购物车、Checkout 和支持页都会读取这里的配置。"
        statusMessage={null}
        isPending={isPending}
        onSave={persistConfig}
      />

      <CommerceSettingsForm config={configWithMethods} onChange={handleSettingsChange} />

      <Card
        title="国际物流方式"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
            新增物流方式
          </Button>
        )}
      >
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 1180 }}
          dataSource={sortedMethods}
          columns={[
            buildAdminListRowIndexColumn(1, sortedMethods.length || 1),
            { title: '名称', dataIndex: 'name', width: 160 },
            { title: '编码', dataIndex: 'code', width: 140 },
            { title: '时效', dataIndex: 'etaLabel', width: 120 },
            {
              title: '排序',
              dataIndex: 'sortOrder',
              width: 96,
              render: (value: number, row: AdminShippingMethodListItem) => (
                <InputNumber
                  min={0}
                  precision={0}
                  value={value}
                  style={{ width: '100%' }}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(next) => void patchMethodSortOrder(row.id, next)}
                />
              ),
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              width: 88,
              render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
            },
            { title: '说明', dataIndex: 'note', ellipsis: true },
            {
              title: '国家费率',
              key: 'countryRates',
              width: 220,
              render: (_: unknown, row: AdminShippingMethodListItem) => {
                const rates = ratesForShippingMethod(configWithMethods, row.code);
                return (
                  <div className="shipping-method-country-rates">
                    <Tooltip title="编辑国家费率" {...ADMIN_ACTION_TOOLTIP_PROPS}>
                      <button
                        type="button"
                        className="admin-count-hotzone shipping-method-country-rates__toolbar"
                        aria-label="编辑国家费率"
                        onClick={() => openRatesModal(row)}
                      >
                        <span className="admin-count-hotzone__icon"><GlobalOutlined /></span>
                        <span className="admin-count-hotzone__count">({rates.length})</span>
                      </button>
                    </Tooltip>
                    {rates.length ? (
                      <div className="shipping-method-country-rates__list">
                        {rates.map((rate) => (
                          <button
                            key={rate.id}
                            type="button"
                            className="shipping-method-country-rates__chip"
                            onClick={() => openRatesModal(row, rate.id)}
                          >
                            {getShippingRateChipLabel(rate)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Typography.Text type="secondary" className="shipping-method-country-rates__empty">
                        暂无费率
                      </Typography.Text>
                    )}
                  </div>
                );
              },
            },
            adminTableFixedActionsColumn({
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: AdminShippingMethodListItem) => (
                <AdminEntityRowActions
                  isActive={row.enabled}
                  entityName="物流方式"
                  toggleDisableDescription="停用后前台将不再展示该物流方式。"
                  toggleEnableDescription="启用后物流方式将恢复展示。"
                  onEdit={() => openEditor(row)}
                  onToggleActive={() => void patchMethodEnabled(row, !row.enabled)}
                  onDelete={() => void deleteShippingMethod(row.id)}
                />
              ),
            }),
          ]}
        />
      </Card>

      <ShippingMethodEditorModal
        open={editorOpen}
        activeLanguages={activeLanguages}
        defaultLocale={defaultLocale}
        editingEntry={editingEntry}
        onClose={() => {
          setEditorOpen(false);
          setEditingEntry(null);
        }}
        onSaved={() => {
          void reloadMethods();
        }}
      />

      <ShippingCountryRatesModal
        open={ratesModalOpen}
        method={editingMethod}
        config={configWithMethods}
        initialRateId={initialRateId}
        onClose={closeRatesModal}
        onChange={updateConfig}
        onPersist={persistConfig}
      />
    </Space>
  );
}
