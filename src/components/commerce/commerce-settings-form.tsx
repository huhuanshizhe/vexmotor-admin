'use client';

import { Card, Form, Select, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { CommerceConfig } from '@/lib/commerce-config';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';

type GeoCountryOption = {
  value: string;
  label: string;
};

export type CommerceSettingsFormValues = {
  currencyCode: string;
  defaultCountryCode: string;
  defaultShippingMethodCode: string;
};

type CommerceSettingsFormProps = {
  config: CommerceConfig;
  onChange: (changedValues: Partial<CommerceSettingsFormValues>) => void;
};

export function CommerceSettingsForm({ config, onChange }: CommerceSettingsFormProps) {
  const [form] = Form.useForm<CommerceSettingsFormValues>();
  const [countryOptions, setCountryOptions] = useState<GeoCountryOption[]>([]);
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);
  const shippingMethodOptions = config.shippingMethods.map((method) => ({
    value: method.code,
    label: `${method.name} (${method.code})`,
  }));

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
      currencyCode: config.currencyCode,
      defaultCountryCode: config.defaultCountryCode,
      defaultShippingMethodCode: config.defaultShippingMethodCode,
    });
  }, [config, form]);

  return (
    <Card title="物流默认设置">
      <Form<CommerceSettingsFormValues>
        form={form}
        layout="vertical"
        onValuesChange={onChange}
      >
        <Space size="large" wrap style={{ width: '100%' }} align="start">
          <Form.Item
            label="物流费用默认币种"
            name="currencyCode"
            style={{ minWidth: 360, marginBottom: 0 }}
            extra={(
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                仅用于物流运费与税费估算，不影响前台商品价格展示币种。
              </Typography.Text>
            )}
          >
            <Select showSearch optionFilterProp="label" options={currencyOptions} />
          </Form.Item>
          <Form.Item label="默认国家" name="defaultCountryCode" style={{ minWidth: 280, marginBottom: 0 }}>
            <Select showSearch optionFilterProp="label" options={countryOptions} loading={!countryOptions.length} />
          </Form.Item>
          <Form.Item label="默认物流方式" name="defaultShippingMethodCode" style={{ minWidth: 260, marginBottom: 0 }}>
            <Select options={shippingMethodOptions} />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
