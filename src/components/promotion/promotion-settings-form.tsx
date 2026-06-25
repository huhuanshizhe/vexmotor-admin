'use client';

import { Card, Form, Select, Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import type { PromotionSettings } from '@/lib/promotion-settings';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';

export type PromotionSettingsFormValues = {
  defaultCurrencyCode: string;
};

type PromotionSettingsFormProps = {
  settings: PromotionSettings;
  onChange: (changedValues: Partial<PromotionSettingsFormValues>) => void;
};

export function PromotionSettingsForm({ settings, onChange }: PromotionSettingsFormProps) {
  const [form] = Form.useForm<PromotionSettingsFormValues>();
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

  useEffect(() => {
    form.setFieldsValue({
      defaultCurrencyCode: settings.defaultCurrencyCode,
    });
  }, [settings, form]);

  return (
    <Card title="优惠券默认设置">
      <Form<PromotionSettingsFormValues> form={form} layout="vertical" onValuesChange={onChange}>
        <Form.Item
          label="优惠券默认币种"
          name="defaultCurrencyCode"
          style={{ minWidth: 360, marginBottom: 0 }}
          extra={(
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              用于满减、特价与最多抵扣金额的展示与校验，不影响前台商品价格币种。
            </Typography.Text>
          )}
        >
          <Select showSearch optionFilterProp="label" options={currencyOptions} />
        </Form.Item>
      </Form>
    </Card>
  );
}
