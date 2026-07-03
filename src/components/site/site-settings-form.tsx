'use client';

import { Card, Form, Select, Space } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { SiteSettings } from '@/lib/site-settings';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';

type GeoCountryOption = {
  value: string;
  label: string;
};

type SiteSettingsFormProps = {
  settings: SiteSettings;
  onChange: (changedValues: Partial<SiteSettings>) => void;
};

export function SiteSettingsForm({ settings, onChange }: SiteSettingsFormProps) {
  const [form] = Form.useForm<SiteSettings>();
  const [countryOptions, setCountryOptions] = useState<GeoCountryOption[]>([]);
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

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
      defaultCurrencyCode: settings.defaultCurrencyCode,
      defaultCountryCode: settings.defaultCountryCode,
    });
  }, [form, settings]);

  return (
    <Card title="站点默认设置">
      <Form<SiteSettings>
        form={form}
        layout="vertical"
        onValuesChange={onChange}
      >
        <Space size="large" wrap style={{ width: '100%' }} align="start">
          <Form.Item
            label="默认币种"
            name="defaultCurrencyCode"
            style={{ minWidth: 360, marginBottom: 0 }}
          >
            <Select showSearch optionFilterProp="label" options={currencyOptions} />
          </Form.Item>
          <Form.Item
            label="默认国家"
            name="defaultCountryCode"
            style={{ minWidth: 280, marginBottom: 0 }}
          >
            <Select showSearch optionFilterProp="label" options={countryOptions} loading={!countryOptions.length} />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
