'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn } from '@/components/admin/admin-table';
import { createLocalId, formatCommerceMoney } from '@/components/commerce/commerce-utils';
import type { CommerceConfig, ShippingCountryRateConfig, ShippingMethodConfig } from '@/lib/commerce-config';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import {
  getShippingRegionFlatSelectOptions,
  getShippingRegionGroupedSelectOptions,
  getShippingRegionLabel,
  getShippingRegionName,
  isShippingRegionCode,
} from '@/lib/shipping-regions';
import { decimalToTaxRatePercentValue, formatTaxRatePercent, parseTaxRatePercentInput } from '@/lib/tax-rate';

type CountryRateFormValues = {
  countryCode: string;
  rate: number;
  freeShippingThreshold: number | null;
  taxRatePercent: number | null;
  enabled: boolean;
  note: string;
};

type ShippingCountryRatesModalProps = {
  open: boolean;
  method: ShippingMethodConfig | null;
  config: CommerceConfig;
  initialRateId?: string | null;
  onClose: () => void;
  onChange: (updater: (current: CommerceConfig) => CommerceConfig) => void;
};

export function ShippingCountryRatesModal({
  open,
  method,
  config,
  initialRateId = null,
  onClose,
  onChange,
}: ShippingCountryRatesModalProps) {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [form] = Form.useForm<CountryRateFormValues>();

  const rates = useMemo(
    () => (method
      ? config.shippingCountryRates
        .filter((rate) => rate.shippingMethodCode === method.code)
        .sort((left, right) => left.countryCode.localeCompare(right.countryCode))
      : []),
    [config.shippingCountryRates, method],
  );

  const usedCountryCodes = useMemo(() => rates.map((rate) => rate.countryCode), [rates]);

  const addableCountryOptions = useMemo(
    () => getShippingRegionGroupedSelectOptions(usedCountryCodes),
    [usedCountryCodes],
  );

  const formCountryOptions = useMemo(() => {
    if (!editingRateId) {
      return addableCountryOptions;
    }
    const rate = rates.find((item) => item.id === editingRateId);
    if (!rate) {
      return [];
    }
    return [{
      label: '当前',
      options: [{ value: rate.countryCode, label: getShippingRegionLabel(rate.countryCode) }],
    }];
  }, [addableCountryOptions, editingRateId, rates]);

  useEffect(() => {
    if (!open || !method) {
      setSelectedRateId(null);
      setFormModalOpen(false);
      setEditingRateId(null);
      return;
    }
    if (initialRateId && rates.some((rate) => rate.id === initialRateId)) {
      setSelectedRateId(initialRateId);
      return;
    }
    if (!initialRateId) {
      setSelectedRateId(null);
    }
  }, [open, method, initialRateId, rates]);

  function openRateForm(rate?: ShippingCountryRateConfig) {
    if (!method) return;
    setEditingRateId(rate?.id ?? null);
    const selectableCountries = getShippingRegionFlatSelectOptions(
      rates.filter((item) => item.id !== rate?.id).map((item) => item.countryCode),
    );
    const defaultCountryCode = selectableCountries.find((option) => option.value === config.defaultCountryCode)?.value
      ?? selectableCountries[0]?.value
      ?? config.defaultCountryCode;

    form.setFieldsValue({
      countryCode: rate?.countryCode ?? defaultCountryCode,
      rate: rate?.rate ?? 0,
      freeShippingThreshold: rate?.freeShippingThreshold ?? null,
      taxRatePercent: rate?.taxRate ? decimalToTaxRatePercentValue(rate.taxRate) : null,
      enabled: rate?.enabled ?? true,
      note: rate?.note ?? '',
    });
    setFormModalOpen(true);
  }

  function saveRate() {
    if (!method) return;
    void form.validateFields().then((values) => {
      if (!isShippingRegionCode(values.countryCode)) {
        void message.error('请选择有效的国家/地区');
        return;
      }

      const duplicate = rates.some(
        (rate) => rate.countryCode === values.countryCode && rate.id !== editingRateId,
      );
      if (duplicate) {
        void message.error('该物流方式已存在此国家/地区的费率');
        return;
      }

      const taxRate = parseTaxRatePercentInput(values.taxRatePercent);

      onChange((current) => {
        const nextRate: ShippingCountryRateConfig = {
          id: editingRateId ?? createLocalId('rate'),
          countryCode: values.countryCode,
          countryName: getShippingRegionName(values.countryCode),
          shippingMethodCode: method.code,
          rate: values.rate,
          freeShippingThreshold: values.freeShippingThreshold == null ? null : values.freeShippingThreshold,
          taxRate,
          enabled: values.enabled,
          note: values.note.trim() || null,
        };

        return {
          ...current,
          shippingCountryRates: editingRateId
            ? current.shippingCountryRates.map((rate) => (rate.id === editingRateId ? nextRate : rate))
            : [...current.shippingCountryRates, nextRate],
        };
      });
      setFormModalOpen(false);
      setEditingRateId(null);
      form.resetFields();
    });
  }

  function deleteRate(id: string) {
    onChange((current) => ({
      ...current,
      shippingCountryRates: current.shippingCountryRates.filter((rate) => rate.id !== id),
    }));
    if (selectedRateId === id) {
      setSelectedRateId(null);
    }
  }

  function patchRateEnabled(row: ShippingCountryRateConfig, enabled: boolean) {
    onChange((current) => ({
      ...current,
      shippingCountryRates: current.shippingCountryRates.map((rate) => (
        rate.id === row.id ? { ...rate, enabled } : rate
      )),
    }));
  }

  return (
    <>
      <Modal
        title={method ? `国家费率 · ${method.name}` : '国家费率'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        destroyOnHidden
        className="content-editor-modal shipping-country-rates-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Typography.Text type="secondary">物流方式编码：{method?.code ?? '—'}</Typography.Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!addableCountryOptions.length}
              onClick={() => openRateForm()}
            >
              新增国家费率
            </Button>
          </Space>

          <Table
            rowKey="id"
            pagination={false}
            scroll={{ x: 1020 }}
            dataSource={rates}
            onRow={(row) => ({
              onClick: () => setSelectedRateId(row.id),
              style: {
                cursor: 'pointer',
                background: row.id === selectedRateId ? 'rgba(255, 126, 0, 0.08)' : undefined,
              },
            })}
            columns={[
              buildAdminListRowIndexColumn(1, rates.length || 1),
              {
                title: '国家/地区',
                dataIndex: 'countryName',
                render: (_: string, row: ShippingCountryRateConfig) => getShippingRegionLabel(row.countryCode),
              },
              {
                title: '基础运费',
                dataIndex: 'rate',
                render: (value: number) => formatCommerceMoney(value, config.currencyCode),
              },
              {
                title: '免运门槛',
                dataIndex: 'freeShippingThreshold',
                render: (value: number | null) => (value == null ? '—' : formatCommerceMoney(value, config.currencyCode)),
              },
              {
                title: '税率估算',
                dataIndex: 'taxRate',
                render: (value: number) => (value > 0 ? formatTaxRatePercent(value) : '—'),
              },
              {
                title: '状态',
                dataIndex: 'enabled',
                render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
              },
              { title: '备注', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
              adminTableFixedActionsColumn({
                title: '操作',
                key: 'actions',
                render: (_: unknown, row: ShippingCountryRateConfig) => (
                  <div onClick={(event) => event.stopPropagation()}>
                    <AdminEntityRowActions
                      isActive={row.enabled}
                      entityName="国家费率"
                      toggleDisableDescription="停用后该国家/地区将不再使用此费率估算。"
                      toggleEnableDescription="启用后该国家/地区将恢复使用此费率估算。"
                      onEdit={() => openRateForm(row)}
                      onToggleActive={() => patchRateEnabled(row, !row.enabled)}
                      onDelete={() => deleteRate(row.id)}
                    />
                  </div>
                ),
              }),
            ]}
            locale={{ emptyText: '暂无国家费率，点击「新增国家费率」添加' }}
          />

          {selectedRateId ? (
            <Typography.Text type="secondary">已选中一行，点击编辑图标可修改该国家费率</Typography.Text>
          ) : (
            <Typography.Text type="secondary">点击列表行可选中该国家费率</Typography.Text>
          )}
        </Space>
      </Modal>

      <Modal
        open={formModalOpen}
        title={editingRateId ? '编辑国家费率' : '新增国家费率'}
        onCancel={() => {
          setFormModalOpen(false);
          setEditingRateId(null);
        }}
        onOk={saveRate}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ enabled: true, rate: 0, taxRatePercent: null, freeShippingThreshold: null }}>
          <Form.Item label="国家/地区" name="countryCode" rules={[{ required: true, message: '请选择国家/地区' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              disabled={!!editingRateId}
              options={formCountryOptions}
            />
          </Form.Item>
          <Form.Item label="基础运费" name="rate" rules={[{ required: true }]}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter={config.currencyCode} />
          </Form.Item>
          <Form.Item label="免运门槛" name="freeShippingThreshold">
            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter={config.currencyCode} />
          </Form.Item>
          <Form.Item label="税率估算" name="taxRatePercent" extra="直接输入百分数，如 8 表示 8%">
            <InputNumber min={0} max={100} step={0.01} precision={4} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
