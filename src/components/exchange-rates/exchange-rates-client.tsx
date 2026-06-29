'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd';
import { useMemo, useState } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn } from '@/components/admin/admin-table';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { ExchangeRateSettingsForm } from '@/components/exchange-rates/exchange-rate-settings-form';
import { useExchangeRateConfig } from '@/components/exchange-rates/use-exchange-rates-config';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import { COMMON_CURRENCIES, getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';
import type { ExchangeRateConfig, ExchangeRateRow } from '@/lib/exchange-rate-config';

type RateFormValues = {
  currencyCode: string;
  rateToBase: number;
};

function getCurrencyLabel(code: string) {
  const match = COMMON_CURRENCIES.find((item) => item.code === code);
  return match ? `${match.code} — ${match.nameZh}` : code;
}

export function ExchangeRatesClient({ initialConfig }: { initialConfig: ExchangeRateConfig }) {
  const { config, isPending, updateConfig, persistConfig } = useExchangeRateConfig(initialConfig);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [rateForm] = Form.useForm<RateFormValues>();
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

  const availableCurrencyOptions = useMemo(
    () => currencyOptions.map((group) => ({
      ...group,
      options: group.options.filter((option) => {
        const code = String(option.value);
        if (code === config.baseCurrencyCode) return false;
        if (editingCode === code) return true;
        return !config.rates.some((row) => row.currencyCode === code);
      }),
    })).filter((group) => group.options.length),
    [currencyOptions, config.baseCurrencyCode, config.rates, editingCode],
  );

  function handleSettingsChange(changedValues: Partial<{ baseCurrencyCode: string }>) {
    if (!changedValues.baseCurrencyCode) return;
    const nextBase = changedValues.baseCurrencyCode.toUpperCase();
    const currentBase = config.baseCurrencyCode.toUpperCase();
    if (nextBase === currentBase) return;

    Modal.confirm({
      title: '切换汇率基准币种',
      content: '切换基准币种将清空现有币种汇率列表，需重新录入。是否继续？',
      okText: '继续切换',
      cancelText: '取消',
      onOk: () => {
        updateConfig(() => ({
          baseCurrencyCode: nextBase,
          rates: [],
        }));
      },
    });
  }

  function openRateModal(row?: ExchangeRateRow) {
    setEditingCode(row?.currencyCode ?? null);
    rateForm.setFieldsValue({
      currencyCode: row?.currencyCode ?? '',
      rateToBase: row?.rateToBase ?? undefined,
    });
    setModalOpen(true);
  }

  function saveRate() {
    void rateForm.validateFields().then((values) => {
      const currencyCode = values.currencyCode.trim().toUpperCase();
      const rateToBase = Number(values.rateToBase);
      if (!currencyCode || currencyCode === config.baseCurrencyCode) {
        void message.error('请选择有效的非基准币种');
        return;
      }
      if (!Number.isFinite(rateToBase) || rateToBase <= 0) {
        void message.error('汇率必须大于 0');
        return;
      }

      updateConfig((current) => {
        const withoutCurrent = current.rates.filter((row) => row.currencyCode !== editingCode);
        const exists = withoutCurrent.some((row) => row.currencyCode === currencyCode);
        if (exists) {
          void message.error('该币种已存在');
          return current;
        }
        const nextRates = [...withoutCurrent, { currencyCode, rateToBase }]
          .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode));
        return { ...current, rates: nextRates };
      });
      setModalOpen(false);
      setEditingCode(null);
    });
  }

  function deleteRate(currencyCode: string) {
    updateConfig((current) => ({
      ...current,
      rates: current.rates.filter((row) => row.currencyCode !== currencyCode),
    }));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="汇率管理"
        description="维护各币种相对基准币种的汇率。商品多语言翻译时的价格换算使用此配置。"
        statusMessage={null}
        isPending={isPending}
        onSave={() => void persistConfig()}
      />

      <ExchangeRateSettingsForm config={config} onChange={handleSettingsChange} />

      <Card
        title="币种汇率"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openRateModal()}>
            新增汇率
          </Button>
        )}
      >
        <Table
          rowKey="currencyCode"
          pagination={false}
          dataSource={config.rates}
          columns={[
            buildAdminListRowIndexColumn(1, Math.max(config.rates.length, 1)),
            {
              title: '币种',
              dataIndex: 'currencyCode',
              width: 180,
              render: (value: string) => getCurrencyLabel(value),
            },
            {
              title: `1 单位币种 = ? ${config.baseCurrencyCode}`,
              dataIndex: 'rateToBase',
              render: (value: number) => Number(value).toFixed(8).replace(/\.?0+$/, ''),
            },
            {
              title: '说明',
              key: 'hint',
              render: (_: unknown, row: ExchangeRateRow) => (
                <Typography.Text type="secondary">
                  例：100 {row.currencyCode} ≈ {(100 * row.rateToBase).toFixed(2)} {config.baseCurrencyCode}
                </Typography.Text>
              ),
            },
            {
              ...adminTableFixedActionsColumn,
              render: (_: unknown, row: ExchangeRateRow) => (
                <AdminEntityRowActions
                  isActive
                  showToggle={false}
                  entityName="汇率"
                  onEdit={() => openRateModal(row)}
                  onToggleActive={() => {}}
                  onDelete={() => deleteRate(row.currencyCode)}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingCode ? `编辑汇率 · ${editingCode}` : '新增汇率'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingCode(null);
        }}
        onOk={() => saveRate()}
        destroyOnHidden
      >
        <Form<RateFormValues> form={rateForm} layout="vertical">
          <Form.Item
            label="币种"
            name="currencyCode"
            rules={[{ required: true, message: '请选择币种' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={availableCurrencyOptions}
              disabled={Boolean(editingCode)}
            />
          </Form.Item>
          <Form.Item
            label={`1 单位币种 = ? ${config.baseCurrencyCode}`}
            name="rateToBase"
            rules={[{ required: true, message: '请填写汇率' }]}
          >
            <InputNumber min={0.00000001} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
