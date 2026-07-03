'use client';

import { Alert, Card, Descriptions, Form, Select, Space, Switch, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AdminSiteSettingsResponse } from '@/lib/site-settings';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';

type GeoCountryOption = {
  value: string;
  label: string;
};

type GlobalSettingsFormProps = {
  settings: AdminSiteSettingsResponse;
  onChange: (changedValues: Partial<AdminSiteSettingsResponse>) => void;
};

function GatewayStatusTag({ configured }: { configured: boolean }) {
  return (
    <Tag color={configured ? 'success' : 'warning'}>
      {configured ? '已配置' : '未配置'}
    </Tag>
  );
}

export function GlobalSettingsForm({ settings, onChange }: GlobalSettingsFormProps) {
  const [form] = Form.useForm<AdminSiteSettingsResponse>();
  const [countryOptions, setCountryOptions] = useState<GeoCountryOption[]>([]);
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);
  const activeModeLabel = settings.paymentSandboxMode ? 'Sandbox' : 'Live';
  const activeModeColor = settings.paymentSandboxMode ? 'orange' : 'green';

  useEffect(() => {
    void fetch('/api/admin/geo/countries')
      .then((response) => response.json())
      .then((payload: { items?: Array<{ isoAlpha2: string; label: string }> }) => {
        const options = (payload.items ?? []).map((item) => ({
          value: item.isoAlpha2,
          label: item.label,
        }));
        setCountryOptions(options);
      })
      .catch(() => setCountryOptions([]));
  }, []);

  useEffect(() => {
    form.setFieldsValue({
      defaultCountryCode: settings.defaultCountryCode,
      defaultCurrencyCode: settings.defaultCurrencyCode,
      paymentSandboxMode: settings.paymentSandboxMode,
    });
  }, [form, settings]);

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card title="区域与货币">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
          设置访客默认国家与展示币种，用于地址默认值、购物车运费估算等场景。
        </Typography.Paragraph>
        <Form<AdminSiteSettingsResponse>
          form={form}
          layout="vertical"
          onValuesChange={onChange}
        >
          <Space size="large" wrap style={{ width: '100%' }} align="start">
            <Form.Item
              label="默认国家"
              name="defaultCountryCode"
              style={{ minWidth: 280, marginBottom: 0 }}
            >
              <Select showSearch optionFilterProp="label" options={countryOptions} loading={!countryOptions.length} />
            </Form.Item>
            <Form.Item
              label="默认币种"
              name="defaultCurrencyCode"
              style={{ minWidth: 360, marginBottom: 0 }}
            >
              <Select showSearch optionFilterProp="label" options={currencyOptions} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card
        title="支付环境"
        extra={<Tag color={activeModeColor}>{activeModeLabel}</Tag>}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type={settings.paymentSandboxMode ? 'warning' : 'info'}
            showIcon
            message={settings.paymentSandboxMode ? '当前为沙盒模式' : '当前为 Live 模式'}
            description={
              settings.paymentSandboxMode
                ? '开启后将使用测试密钥处理支付，结账页会显示 Sandbox 角标，不会产生真实扣款。'
                : '关闭后将使用生产密钥处理支付，请确认 Live 环境变量已正确配置。'
            }
          />

          <Form<AdminSiteSettingsResponse>
            form={form}
            layout="vertical"
            onValuesChange={onChange}
          >
            <Form.Item
              label="支付沙盒模式"
              name="paymentSandboxMode"
              valuePropName="checked"
              extra="开关状态决定读取哪一套 Stripe / Airwallex 环境变量。"
            >
              <Switch checkedChildren="沙盒" unCheckedChildren="Live" />
            </Form.Item>
          </Form>

          <Descriptions
            title="网关状态"
            size="small"
            column={{ xs: 1, sm: 2 }}
            bordered
          >
            <Descriptions.Item label="当前环境">
              <Tag color={activeModeColor}>{activeModeLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Stripe">
              <GatewayStatusTag configured={settings.paymentDiagnostics.stripe.configured} />
            </Descriptions.Item>
            <Descriptions.Item label="Airwallex">
              <GatewayStatusTag configured={settings.paymentDiagnostics.airwallex.configured} />
            </Descriptions.Item>
            <Descriptions.Item label="说明">
              密钥通过服务器环境变量配置，不在此页面展示。
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
    </Space>
  );
}
