'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn } from '@/components/admin/admin-table';
import { createLocalId, formatCommerceMoney } from '@/components/commerce/commerce-utils';
import type { CommerceConfig, ShippingCountryRateConfig, ShippingMethodConfig } from '@/lib/commerce-config';
import {
  normalizeShippingCountryRateConfig,
} from '@/lib/commerce-shipping-rate';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import { formatCurrencyLabel, getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';
import {
  getShippingContinent,
  getShippingContinentLabel,
  getShippingContinentSelectOptions,
  isShippingContinentCode,
  type ShippingContinentCode,
} from '@/lib/shipping-continents';
import { validateShippingRateScope } from '@/lib/shipping-rate-uniqueness';
import { decimalToTaxRatePercentValue, formatTaxRatePercent, parseTaxRatePercentInput } from '@/lib/tax-rate';

type GeoCountryOption = {
  value: string;
  label: string;
  nameEn: string;
};

type CountryRateFormValues = {
  regionCode: ShippingContinentCode;
  countryIsoCode: string | null;
  currencyCode: string;
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
  onPersist?: (snapshot?: CommerceConfig) => Promise<boolean>;
};

export function ShippingCountryRatesModal({
  open,
  method,
  config,
  initialRateId = null,
  onClose,
  onChange,
  onPersist,
}: ShippingCountryRatesModalProps) {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [continentCountries, setContinentCountries] = useState<GeoCountryOption[]>([]);
  const [form] = Form.useForm<CountryRateFormValues>();
  const selectedRegionCode = Form.useWatch('regionCode', form);
  const selectedCurrencyCode = Form.useWatch('currencyCode', form) ?? 'USD';
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

  const rates = useMemo(
    () => (method
      ? config.shippingCountryRates
        .filter((rate) => rate.shippingMethodCode === method.code)
        .sort(
          (left, right) =>
            left.regionCode.localeCompare(right.regionCode)
            || (left.countryIsoCode ?? '').localeCompare(right.countryIsoCode ?? ''),
        )
      : []),
    [config.shippingCountryRates, method],
  );

  const regionOptions = useMemo(() => getShippingContinentSelectOptions(), []);

  useEffect(() => {
    if (!selectedRegionCode) {
      setContinentCountries([]);
      return;
    }
    void fetch(`/api/admin/geo/countries?continent=${selectedRegionCode}`)
      .then((response) => response.json())
      .then((payload: { items?: Array<{ isoAlpha2: string; label: string; nameEn: string }> }) => {
        setContinentCountries((payload.items ?? []).map((item) => ({
          value: item.isoAlpha2,
          label: item.label,
          nameEn: item.nameEn,
        })));
      })
      .catch(() => setContinentCountries([]));
  }, [selectedRegionCode]);

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
    form.setFieldsValue({
      regionCode: rate?.regionCode ?? 'EUROPE',
      countryIsoCode: rate?.countryIsoCode ?? null,
      currencyCode: rate?.currencyCode ?? 'USD',
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
    void form.validateFields().then(async (values) => {
      if (!isShippingContinentCode(values.regionCode)) {
        void message.error('请选择有效的地区');
        return;
      }

      const validation = validateShippingRateScope(config.shippingCountryRates, {
        shippingMethodCode: method.code,
        regionCode: values.regionCode,
        countryIsoCode: values.countryIsoCode,
        editingId: editingRateId,
      });
      if (!validation.ok) {
        void message.error(validation.message);
        return;
      }

      const taxRate = parseTaxRatePercentInput(values.taxRatePercent);
      const selectedCountry = values.countryIsoCode
        ? continentCountries.find((item) => item.value === values.countryIsoCode)
        : null;

      const nextRate = normalizeShippingCountryRateConfig({
        id: editingRateId ?? createLocalId('rate'),
        regionCode: values.regionCode,
        countryIsoCode: values.countryIsoCode,
        regionName: getShippingContinentLabel(values.regionCode).split(' — ')[1],
        countryName: selectedCountry?.nameEn ?? null,
        shippingMethodCode: method.code,
        currencyCode: values.currencyCode,
        rate: values.rate,
        freeShippingThreshold: values.freeShippingThreshold == null ? null : values.freeShippingThreshold,
        taxRate,
        enabled: values.enabled,
        note: values.note.trim() || null,
      });

      const nextConfig: CommerceConfig = {
        ...config,
        shippingCountryRates: editingRateId
          ? config.shippingCountryRates.map((rate) => (rate.id === editingRateId ? nextRate : rate))
          : [...config.shippingCountryRates, nextRate],
      };

      onChange(() => nextConfig);
      const persisted = onPersist ? await onPersist(nextConfig) : true;
      if (!persisted) {
        return;
      }
      setFormModalOpen(false);
      setEditingRateId(null);
      form.resetFields();
      if (!onPersist) {
        void message.success('保存成功');
      }
    });
  }

  async function deleteRate(id: string) {
    const nextConfig: CommerceConfig = {
      ...config,
      shippingCountryRates: config.shippingCountryRates.filter((rate) => rate.id !== id),
    };
    onChange(() => nextConfig);
    if (selectedRateId === id) {
      setSelectedRateId(null);
    }
    if (onPersist) {
      await onPersist(nextConfig);
    }
  }

  async function patchRateEnabled(row: ShippingCountryRateConfig, enabled: boolean) {
    const nextConfig: CommerceConfig = {
      ...config,
      shippingCountryRates: config.shippingCountryRates.map((rate) => (
        rate.id === row.id ? { ...rate, enabled } : rate
      )),
    };
    onChange(() => nextConfig);
    if (onPersist) {
      await onPersist(nextConfig);
    }
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openRateForm()}>
              新增国家费率
            </Button>
          </Space>

          <Table
            rowKey="id"
            pagination={false}
            scroll={{ x: 960 }}
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
                title: '地区',
                dataIndex: 'regionCode',
                render: (_: string, row: ShippingCountryRateConfig) => (
                  getShippingContinent(row.regionCode)?.name ?? row.regionName ?? row.regionCode
                ),
              },
              {
                title: '国家',
                dataIndex: 'countryIsoCode',
                render: (_: string | null, row: ShippingCountryRateConfig) => {
                  if (!row.countryIsoCode) return '—';
                  return row.countryName ?? row.countryIsoCode;
                },
              },
              {
                title: '币种',
                dataIndex: 'currencyCode',
                width: 120,
                render: (value: string) => formatCurrencyLabel(value),
              },
              {
                title: '基础运费',
                dataIndex: 'rate',
                render: (value: number, row: ShippingCountryRateConfig) => formatCommerceMoney(value, row.currencyCode),
              },
              {
                title: '免运门槛',
                dataIndex: 'freeShippingThreshold',
                render: (value: number | null, row: ShippingCountryRateConfig) => (
                  value == null ? '—' : formatCommerceMoney(value, row.currencyCode)
                ),
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
                      toggleDisableDescription="停用后该费率范围将不再用于运费估算。"
                      toggleEnableDescription="启用后该费率范围将恢复用于运费估算。"
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
        <Form
          form={form}
          layout="vertical"
          initialValues={{ enabled: true, rate: 0, currencyCode: 'USD', taxRatePercent: null, freeShippingThreshold: null, countryIsoCode: null }}
          onValuesChange={(changed) => {
            if ('regionCode' in changed) {
              form.setFieldValue('countryIsoCode', null);
            }
          }}
        >
          <Form.Item label="地区" name="regionCode" rules={[{ required: true, message: '请选择地区' }]}>
            <Select showSearch optionFilterProp="label" options={regionOptions} />
          </Form.Item>
          <Form.Item label="国家" name="countryIsoCode" extra="可选；留空表示仅按地区计费">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!selectedRegionCode}
              options={continentCountries.map((country) => ({ value: country.value, label: country.label }))}
              placeholder={selectedRegionCode ? '不选则仅按地区' : '请先选择地区'}
            />
          </Form.Item>
          <Form.Item label="货币单位" name="currencyCode" rules={[{ required: true, message: '请选择货币' }]}>
            <Select showSearch optionFilterProp="label" options={currencyOptions} />
          </Form.Item>
          <Form.Item label="基础运费" name="rate" rules={[{ required: true }]}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter={selectedCurrencyCode} />
          </Form.Item>
          <Form.Item label="免运门槛" name="freeShippingThreshold">
            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter={selectedCurrencyCode} />
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
