'use client';

import { Card, Form, Select, Space, Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import type { ExchangeRateConfig } from '@/lib/exchange-rate-config';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';

export type ExchangeRateSettingsFormValues = {
  baseCurrencyCode: string;
};

type ExchangeRateSettingsFormProps = {
  config: ExchangeRateConfig;
  onChange: (changedValues: Partial<ExchangeRateSettingsFormValues>) => void;
};

export function ExchangeRateSettingsForm({ config, onChange }: ExchangeRateSettingsFormProps) {
  const [form] = Form.useForm<ExchangeRateSettingsFormValues>();
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

  useEffect(() => {
    form.setFieldsValue({
      baseCurrencyCode: config.baseCurrencyCode,
    });
  }, [config.baseCurrencyCode, form]);

  return (
    <Card title="汇率默认设置">
      <Form<ExchangeRateSettingsFormValues>
        form={form}
        layout="vertical"
        onValuesChange={onChange}
      >
        <Space size="large" wrap style={{ width: '100%' }} align="start">
          <Form.Item
            label="汇率基准币种"
            name="baseCurrencyCode"
            style={{ minWidth: 360, marginBottom: 0 }}
            extra={(
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                各币种汇率均表示「1 单位该币种 = ? 单位基准币种」。商品多语言价格换算亦使用此配置。
              </Typography.Text>
            )}
          >
            <Select showSearch optionFilterProp="label" options={currencyOptions} />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
