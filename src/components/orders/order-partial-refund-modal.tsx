'use client';

import { Form, InputNumber, Modal } from 'antd';
import { useEffect } from 'react';

import { formatAdminMoney } from '@/lib/admin-display';

type OrderPartialRefundModalProps = {
  open: boolean;
  totalAmount: string;
  currencyCode?: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (amount: string) => void;
};

export function OrderPartialRefundModal({ open, totalAmount, currencyCode = 'USD', loading, onCancel, onSubmit }: OrderPartialRefundModalProps) {
  const [form] = Form.useForm<{ refundedAmount: number }>();
  const maxAmount = Number(totalAmount);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  function handleOk() {
    form.validateFields().then((values) => {
      onSubmit(values.refundedAmount.toFixed(2));
    });
  }

  return (
    <Modal
      title="标记已部分退款"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="确认部分退款"
      cancelText="取消"
      destroyOnClose
      width={480}
    >
      <p style={{ margin: '0 0 12px', color: '#677489' }}>
        请填写本次已退款金额，须大于 0 且小于订单实付总金额 {formatAdminMoney(totalAmount, currencyCode)}。
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="refundedAmount"
          label="已退款金额"
          rules={[
            { required: true, message: '请填写已退款金额' },
            {
              validator: async (_, value: number | null | undefined) => {
                if (value == null || !Number.isFinite(value) || value <= 0) {
                  throw new Error('已退款金额须大于 0');
                }
                if (value >= maxAmount) {
                  throw new Error(`已退款金额须小于 ${formatAdminMoney(totalAmount, currencyCode)}`);
                }
              },
            },
          ]}
        >
          <InputNumber
            min={0.01}
            max={maxAmount > 0 ? maxAmount - 0.01 : undefined}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入退款金额"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
