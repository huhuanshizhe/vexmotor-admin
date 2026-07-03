'use client';

import { Card, Form, Select, Space } from 'antd';
import { useEffect } from 'react';

import type { CommerceConfig } from '@/lib/commerce-config';

export type CommerceSettingsFormValues = {
  defaultShippingMethodCode: string;
};

type CommerceSettingsFormProps = {
  config: CommerceConfig;
  onChange: (changedValues: Partial<CommerceSettingsFormValues>) => void;
};

export function CommerceSettingsForm({ config, onChange }: CommerceSettingsFormProps) {
  const [form] = Form.useForm<CommerceSettingsFormValues>();
  const shippingMethodOptions = config.shippingMethods.map((method) => ({
    value: method.code,
    label: `${method.name} (${method.code})`,
  }));

  useEffect(() => {
    form.setFieldsValue({
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
          <Form.Item label="默认物流方式" name="defaultShippingMethodCode" style={{ minWidth: 260, marginBottom: 0 }}>
            <Select options={shippingMethodOptions} />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
