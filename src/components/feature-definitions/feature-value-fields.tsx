'use client';

import { Form, Input, InputNumber, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';

import type { FeatureValueType } from '@/lib/feature-definition-content';
import { featureValueTypeLabels } from '@/lib/feature-definition-content';

const numericInputProps = {
  style: { width: '100%' as const },
  step: 0.0001,
  stringMode: false as const,
};

type LocaleFormValues = {
  name: string;
  valueText: string;
  valueMin: number | null;
  valueMax: number | null;
  unit: string;
};

type FeatureValueFieldsProps = {
  form: FormInstance<LocaleFormValues>;
  valueType: FeatureValueType;
  selectOptions: string[];
};

export function FeatureValueFields({ form, valueType, selectOptions }: FeatureValueFieldsProps) {
  if (valueType === 'boolean') {
    return (
      <Form.Item label="值" required>
        <Switch
          checked={form.getFieldValue('valueText') === 'true'}
          checkedChildren="是"
          unCheckedChildren="否"
          onChange={(checked) => form.setFieldValue('valueText', checked ? 'true' : 'false')}
        />
      </Form.Item>
    );
  }

  if (valueType === 'select') {
    return (
      <Form.Item
        label="值"
        name="valueText"
        rules={[{ required: true, message: '请选择特性值' }]}
      >
        <Select
          placeholder="请选择"
          options={selectOptions.map((option) => ({ value: option, label: option }))}
          allowClear
        />
      </Form.Item>
    );
  }

  if (valueType === 'number') {
    return (
      <Form.Item
        label="值"
        name="valueMin"
        rules={[{ required: true, message: '请输入数值' }]}
      >
        <InputNumber {...numericInputProps} placeholder="请输入数值（支持负数与小数）" />
      </Form.Item>
    );
  }

  if (valueType === 'range') {
    return (
      <Form.Item label="值" required>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            name="valueMin"
            rules={[{ required: true, message: '请输入最小值' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber {...numericInputProps} placeholder="最小值" />
          </Form.Item>
          <Form.Item
            name="valueMax"
            rules={[{ required: true, message: '请输入最大值' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber {...numericInputProps} placeholder="最大值" />
          </Form.Item>
        </div>
      </Form.Item>
    );
  }

  return (
    <Form.Item
      label="值"
      name="valueText"
      rules={[{ required: true, message: '请输入特性值' }]}
      extra={`值类型：${featureValueTypeLabels[valueType]}`}
    >
      <Input placeholder="请输入特性值" />
    </Form.Item>
  );
}
