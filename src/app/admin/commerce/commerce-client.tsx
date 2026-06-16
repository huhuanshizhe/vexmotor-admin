'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Tabs, Typography } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import type { CommerceConfig, ShippingCountryRateConfig, ShippingMethodConfig, VolumePricingRuleConfig } from '@/lib/commerce-config';

type SettingsFormValues = {
  currencyCode: string;
  defaultCountryCode: string;
  defaultShippingMethodCode: string;
};

type VolumeRuleFormValues = {
  label: string;
  minQuantity: number;
  priceFactor: number;
  note: string;
  enabled: boolean;
};

type ShippingMethodFormValues = {
  code: string;
  name: string;
  etaLabel: string;
  note: string;
  enabled: boolean;
  sortOrder: number;
};

type CountryRateFormValues = {
  countryCode: string;
  countryName: string;
  shippingMethodCode: string;
  rate: number;
  freeShippingThreshold: number | null;
  taxRate: number;
  enabled: boolean;
  note: string;
};

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: currencyCode }).format(amount);
}

function uniqueCountryOptions(config: CommerceConfig) {
  const seen = new Set<string>();

  return config.shippingCountryRates
    .filter((item) => item.enabled)
    .map((item) => ({ value: item.countryCode, label: `${item.countryName} (${item.countryCode})` }))
    .filter((item) => {
      if (seen.has(item.value)) {
        return false;
      }

      seen.add(item.value);
      return true;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function AdminCommerceClient({ initialConfig }: { initialConfig: CommerceConfig }) {
  const [config, setConfig] = useState<CommerceConfig>(initialConfig);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [volumeRuleModalOpen, setVolumeRuleModalOpen] = useState(false);
  const [shippingMethodModalOpen, setShippingMethodModalOpen] = useState(false);
  const [countryRateModalOpen, setCountryRateModalOpen] = useState(false);
  const [editingVolumeRuleId, setEditingVolumeRuleId] = useState<string | null>(null);
  const [editingShippingMethodId, setEditingShippingMethodId] = useState<string | null>(null);
  const [editingCountryRateId, setEditingCountryRateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [settingsForm] = Form.useForm<SettingsFormValues>();
  const [volumeRuleForm] = Form.useForm<VolumeRuleFormValues>();
  const [shippingMethodForm] = Form.useForm<ShippingMethodFormValues>();
  const [countryRateForm] = Form.useForm<CountryRateFormValues>();

  const shippingMethodOptions = useMemo(
    () => config.shippingMethods.map((method) => ({ value: method.code, label: `${method.name} (${method.code})` })),
    [config.shippingMethods],
  );
  const countryOptions = useMemo(() => uniqueCountryOptions(config), [config]);

  function updateConfig(updater: (current: CommerceConfig) => CommerceConfig) {
    setConfig((current) => updater(current));
    setStatusMessage('配置已修改，待保存');
  }

  function syncSettingsForm(nextConfig: CommerceConfig) {
    settingsForm.setFieldsValue({
      currencyCode: nextConfig.currencyCode,
      defaultCountryCode: nextConfig.defaultCountryCode,
      defaultShippingMethodCode: nextConfig.defaultShippingMethodCode,
    });
  }

  function openVolumeRuleModal(rule?: VolumePricingRuleConfig) {
    setEditingVolumeRuleId(rule?.id ?? null);
    volumeRuleForm.setFieldsValue({
      label: rule?.label ?? '',
      minQuantity: rule?.minQuantity ?? 1,
      priceFactor: rule?.priceFactor ?? 1,
      note: rule?.note ?? '',
      enabled: rule?.enabled ?? true,
    });
    setVolumeRuleModalOpen(true);
  }

  function openShippingMethodModal(method?: ShippingMethodConfig) {
    setEditingShippingMethodId(method?.id ?? null);
    shippingMethodForm.setFieldsValue({
      code: method?.code ?? '',
      name: method?.name ?? '',
      etaLabel: method?.etaLabel ?? '',
      note: method?.note ?? '',
      enabled: method?.enabled ?? true,
      sortOrder: method?.sortOrder ?? config.shippingMethods.length,
    });
    setShippingMethodModalOpen(true);
  }

  function openCountryRateModal(rate?: ShippingCountryRateConfig) {
    setEditingCountryRateId(rate?.id ?? null);
    countryRateForm.setFieldsValue({
      countryCode: rate?.countryCode ?? config.defaultCountryCode,
      countryName: rate?.countryName ?? '',
      shippingMethodCode: rate?.shippingMethodCode ?? config.defaultShippingMethodCode,
      rate: rate?.rate ?? 0,
      freeShippingThreshold: rate?.freeShippingThreshold ?? null,
      taxRate: rate?.taxRate ?? 0,
      enabled: rate?.enabled ?? true,
      note: rate?.note ?? '',
    });
    setCountryRateModalOpen(true);
  }

  function saveVolumeRule() {
    void volumeRuleForm.validateFields().then((values) => {
      updateConfig((current) => {
        const nextRule: VolumePricingRuleConfig = {
          id: editingVolumeRuleId ?? createLocalId('tier'),
          label: values.label.trim(),
          minQuantity: values.minQuantity,
          priceFactor: values.priceFactor,
          note: values.note.trim() || null,
          enabled: values.enabled,
        };

        return {
          ...current,
          volumePricingRules: editingVolumeRuleId
            ? current.volumePricingRules.map((rule) => (rule.id === editingVolumeRuleId ? nextRule : rule))
            : [...current.volumePricingRules, nextRule],
        };
      });
      setVolumeRuleModalOpen(false);
      setEditingVolumeRuleId(null);
      volumeRuleForm.resetFields();
    });
  }

  function saveShippingMethod() {
    void shippingMethodForm.validateFields().then((values) => {
      updateConfig((current) => {
        const nextMethod: ShippingMethodConfig = {
          id: editingShippingMethodId ?? createLocalId('method'),
          code: values.code.trim(),
          name: values.name.trim(),
          etaLabel: values.etaLabel.trim(),
          note: values.note.trim(),
          enabled: values.enabled,
          sortOrder: values.sortOrder,
        };

        return {
          ...current,
          shippingMethods: editingShippingMethodId
            ? current.shippingMethods.map((method) => (method.id === editingShippingMethodId ? nextMethod : method))
            : [...current.shippingMethods, nextMethod],
        };
      });
      setShippingMethodModalOpen(false);
      setEditingShippingMethodId(null);
      shippingMethodForm.resetFields();
    });
  }

  function saveCountryRate() {
    void countryRateForm.validateFields().then((values) => {
      updateConfig((current) => {
        const nextRate: ShippingCountryRateConfig = {
          id: editingCountryRateId ?? createLocalId('rate'),
          countryCode: values.countryCode.trim().toUpperCase(),
          countryName: values.countryName.trim(),
          shippingMethodCode: values.shippingMethodCode,
          rate: values.rate,
          freeShippingThreshold: values.freeShippingThreshold == null ? null : values.freeShippingThreshold,
          taxRate: values.taxRate,
          enabled: values.enabled,
          note: values.note.trim() || null,
        };

        return {
          ...current,
          shippingCountryRates: editingCountryRateId
            ? current.shippingCountryRates.map((rate) => (rate.id === editingCountryRateId ? nextRate : rate))
            : [...current.shippingCountryRates, nextRate],
        };
      });
      setCountryRateModalOpen(false);
      setEditingCountryRateId(null);
      countryRateForm.resetFields();
    });
  }

  function persistConfig() {
    startTransition(async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/commerce', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? '保存失败，请检查配置后重试。');
        return;
      }

      const saved = (await response.json()) as CommerceConfig;
      setConfig(saved);
      syncSettingsForm(saved);
      setStatusMessage('配置已保存');
    });
  }

  function handleSettingsChange(changedValues: Partial<SettingsFormValues>) {
    updateConfig((current) => ({
      ...current,
      currencyCode: changedValues.currencyCode?.trim().toUpperCase() ?? current.currencyCode,
      defaultCountryCode: changedValues.defaultCountryCode ?? current.defaultCountryCode,
      defaultShippingMethodCode: changedValues.defaultShippingMethodCode ?? current.defaultShippingMethodCode,
    }));
  }

  function deleteVolumeRule(id: string) {
    updateConfig((current) => ({
      ...current,
      volumePricingRules: current.volumePricingRules.filter((rule) => rule.id !== id),
    }));
  }

  function deleteShippingMethod(id: string) {
    updateConfig((current) => {
      const target = current.shippingMethods.find((method) => method.id === id);
      const nextShippingMethods = current.shippingMethods.filter((method) => method.id !== id);
      const fallbackMethodCode = nextShippingMethods[0]?.code ?? current.defaultShippingMethodCode;

      return {
        ...current,
        defaultShippingMethodCode: target?.code === current.defaultShippingMethodCode ? fallbackMethodCode : current.defaultShippingMethodCode,
        shippingMethods: nextShippingMethods,
        shippingCountryRates: target ? current.shippingCountryRates.filter((rate) => rate.shippingMethodCode !== target.code) : current.shippingCountryRates,
      };
    });
  }

  function deleteCountryRate(id: string) {
    updateConfig((current) => ({
      ...current,
      shippingCountryRates: current.shippingCountryRates.filter((rate) => rate.id !== id),
    }));
  }

  useEffect(() => {
    syncSettingsForm(config);
  }, [config, settingsForm]);

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>定价与物流</Typography.Title>
          <Typography.Paragraph type="secondary">
            统一维护官网阶梯价规则、国际物流方式以及国家级运费与税率估算。购物车、PDP、Checkout 和支持页都会读取这里的配置。
          </Typography.Paragraph>
        </div>
        <Space>
          {statusMessage ? <Typography.Text type={statusMessage.includes('失败') ? 'danger' : 'secondary'}>{statusMessage}</Typography.Text> : null}
          <Button type="primary" icon={<SaveOutlined />} onClick={persistConfig} loading={isPending}>
            保存配置
          </Button>
        </Space>
      </Space>

      <Card>
        <Form<SettingsFormValues>
          form={settingsForm}
          layout="vertical"
          initialValues={{
            currencyCode: config.currencyCode,
            defaultCountryCode: config.defaultCountryCode,
            defaultShippingMethodCode: config.defaultShippingMethodCode,
          }}
          onValuesChange={handleSettingsChange}
        >
          <Space size="large" wrap style={{ width: '100%' }}>
            <Form.Item label="商城币种" name="currencyCode" style={{ minWidth: 160, marginBottom: 0 }}>
              <Input maxLength={3} />
            </Form.Item>
            <Form.Item label="默认国家/地区" name="defaultCountryCode" style={{ minWidth: 220, marginBottom: 0 }}>
              <Select options={countryOptions} />
            </Form.Item>
            <Form.Item label="默认物流方式" name="defaultShippingMethodCode" style={{ minWidth: 260, marginBottom: 0 }}>
              <Select options={shippingMethodOptions} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Tabs
        items={[
          {
            key: 'volume',
            label: `阶梯定价 (${config.volumePricingRules.length})`,
            children: (
              <Card
                title="阶梯定价规则"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openVolumeRuleModal()}>
                    新增阶梯
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={[...config.volumePricingRules].sort((left, right) => left.minQuantity - right.minQuantity)}
                  columns={[
                    { title: '名称', dataIndex: 'label' },
                    { title: '起订数量', dataIndex: 'minQuantity' },
                    {
                      title: '价格系数',
                      dataIndex: 'priceFactor',
                      render: (value: number) => value.toFixed(2),
                    },
                    {
                      title: '优惠幅度',
                      dataIndex: 'priceFactor',
                      render: (value: number) => `${Math.round((1 - value) * 100)}%`,
                    },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
                    },
                    { title: '说明', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: VolumePricingRuleConfig) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openVolumeRuleModal(row)} />
                          <Popconfirm title="确定删除该阶梯规则吗？" onConfirm={() => deleteVolumeRule(row.id)}>
                            <Button danger icon={<DeleteOutlined />} disabled={config.volumePricingRules.length <= 1} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'methods',
            label: `物流方式 (${config.shippingMethods.length})`,
            children: (
              <Card
                title="国际物流方式"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openShippingMethodModal()}>
                    新增物流方式
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={[...config.shippingMethods].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))}
                  columns={[
                    { title: '编码', dataIndex: 'code' },
                    { title: '名称', dataIndex: 'name' },
                    { title: '时效', dataIndex: 'etaLabel' },
                    { title: '排序', dataIndex: 'sortOrder' },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
                    },
                    { title: '说明', dataIndex: 'note' },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: ShippingMethodConfig) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openShippingMethodModal(row)} />
                          <Popconfirm title="删除物流方式后会同时移除关联国家费率，确定继续吗？" onConfirm={() => deleteShippingMethod(row.id)}>
                            <Button danger icon={<DeleteOutlined />} disabled={config.shippingMethods.length <= 1} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'rates',
            label: `国家费率 (${config.shippingCountryRates.length})`,
            children: (
              <Card
                title="国家级运费与税率"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCountryRateModal()}>
                    新增国家费率
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1100 }}
                  dataSource={[...config.shippingCountryRates].sort((left, right) => left.countryCode.localeCompare(right.countryCode) || left.shippingMethodCode.localeCompare(right.shippingMethodCode))}
                  columns={[
                    {
                      title: '国家/地区',
                      dataIndex: 'countryName',
                      render: (_: string, row: ShippingCountryRateConfig) => `${row.countryName} (${row.countryCode})`,
                    },
                    {
                      title: '物流方式',
                      dataIndex: 'shippingMethodCode',
                      render: (value: string) => config.shippingMethods.find((method) => method.code === value)?.name ?? value,
                    },
                    {
                      title: '基础运费',
                      dataIndex: 'rate',
                      render: (value: number) => formatMoney(value, config.currencyCode),
                    },
                    {
                      title: '免运门槛',
                      dataIndex: 'freeShippingThreshold',
                      render: (value: number | null) => (value == null ? '—' : formatMoney(value, config.currencyCode)),
                    },
                    {
                      title: '税率估算',
                      dataIndex: 'taxRate',
                      render: (value: number) => `${(value * 100).toFixed(0)}%`,
                    },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
                    },
                    { title: '备注', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: ShippingCountryRateConfig) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openCountryRateModal(row)} />
                          <Popconfirm title="确定删除该国家费率吗？" onConfirm={() => deleteCountryRate(row.id)}>
                            <Button danger icon={<DeleteOutlined />} disabled={config.shippingCountryRates.length <= 1} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={volumeRuleModalOpen}
        title={editingVolumeRuleId ? '编辑阶梯规则' : '新增阶梯规则'}
        onCancel={() => {
          setVolumeRuleModalOpen(false);
          setEditingVolumeRuleId(null);
        }}
        onOk={saveVolumeRule}
        destroyOnHidden
      >
        <Form form={volumeRuleForm} layout="vertical" initialValues={{ enabled: true, minQuantity: 1, priceFactor: 1, note: '' }}>
          <Form.Item label="名称" name="label" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="起订数量" name="minQuantity" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="价格系数" name="priceFactor" rules={[{ required: true }]}>
            <InputNumber min={0.01} max={1} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="说明" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={shippingMethodModalOpen}
        title={editingShippingMethodId ? '编辑物流方式' : '新增物流方式'}
        onCancel={() => {
          setShippingMethodModalOpen(false);
          setEditingShippingMethodId(null);
        }}
        onOk={saveShippingMethod}
        destroyOnHidden
      >
        <Form form={shippingMethodForm} layout="vertical" initialValues={{ enabled: true, sortOrder: config.shippingMethods.length }}>
          <Form.Item label="编码" name="code" rules={[{ required: true }]}>
            <Input placeholder="dhl-express" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="时效说明" name="etaLabel" rules={[{ required: true }]}>
            <Input placeholder="2-5 个工作日" />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder" rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="说明" name="note" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={countryRateModalOpen}
        title={editingCountryRateId ? '编辑国家费率' : '新增国家费率'}
        onCancel={() => {
          setCountryRateModalOpen(false);
          setEditingCountryRateId(null);
        }}
        onOk={saveCountryRate}
        destroyOnHidden
      >
        <Form form={countryRateForm} layout="vertical" initialValues={{ enabled: true, rate: 0, taxRate: 0, freeShippingThreshold: null }}>
          <Form.Item label="国家代码" name="countryCode" rules={[{ required: true }]}>
            <Input placeholder="US" maxLength={16} />
          </Form.Item>
          <Form.Item label="国家/地区名称" name="countryName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="物流方式" name="shippingMethodCode" rules={[{ required: true }]}>
            <Select options={shippingMethodOptions} />
          </Form.Item>
          <Form.Item label="基础运费" name="rate" rules={[{ required: true }]}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="免运门槛" name="freeShippingThreshold">
            <InputNumber min={0} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="税率估算" name="taxRate" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}