'use client';

import { Form, Input } from 'antd';
import type { FormInstance } from 'antd';

type LocaleFormValues = {
  name: string;
  unit: string;
  textOptionsText: string;
};

type FeatureTextOptionsFieldProps = {
  form: FormInstance<LocaleFormValues>;
};

export function FeatureTextOptionsField({ form }: FeatureTextOptionsFieldProps) {
  return (
    <Form.Item
      label="文本值列表"
      name="textOptionsText"
      extra="每行一个值，供产品编辑时选择或新增"
    >
      <Input.TextArea
        rows={6}
        placeholder={'值 A\n值 B'}
        onChange={(event) => form.setFieldValue('textOptionsText', event.target.value)}
      />
    </Form.Item>
  );
}
