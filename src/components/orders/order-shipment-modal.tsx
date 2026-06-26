'use client';

import { Form, Input, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';

import { AdminDateTimePicker } from '@/components/admin/admin-datetime-picker';
import {
  createDraftShipmentItems,
  OrderShipmentItemsPicker,
  serializeDraftShipmentItems,
  type DraftShipmentItem,
} from '@/components/orders/order-shipment-items-picker';
import type { AdminOrderItem } from '@/server/admin/orders';

export type ShipmentFormValues = {
  trackingNumber: string;
  shippedAt: Dayjs;
  note?: string;
  items: DraftShipmentItem[];
};

type OrderShipmentModalProps = {
  open: boolean;
  orderItems: AdminOrderItem[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    trackingNumber: string;
    shippedAt: string;
    note?: string | null;
    items?: Array<{ orderItemId: string; quantity?: number | null }>;
  }) => void;
};

export function OrderShipmentModal({ open, orderItems, loading, onCancel, onSubmit }: OrderShipmentModalProps) {
  const [form] = Form.useForm<ShipmentFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        trackingNumber: '',
        shippedAt: dayjs(),
        note: '',
        items: createDraftShipmentItems(orderItems),
      });
    }
  }, [open, orderItems, form]);

  function handleOk() {
    form.validateFields().then((values) => {
      const selectedItems = serializeDraftShipmentItems(values.items ?? []);
      onSubmit({
        trackingNumber: values.trackingNumber.trim(),
        shippedAt: values.shippedAt.toISOString(),
        note: values.note?.trim() || null,
        items: selectedItems.length ? selectedItems : undefined,
      });
    });
  }

  return (
    <Modal
      title="添加更多发货记录"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="保存发货记录"
      cancelText="取消"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="trackingNumber"
          label="快递单号"
          rules={[{ required: true, message: '请填写快递单号' }]}
        >
          <Input placeholder="物流追踪单号" />
        </Form.Item>
        <Form.Item
          name="shippedAt"
          label="发货时间"
          rules={[{ required: true, message: '请选择发货时间' }]}
        >
          <AdminDateTimePicker mode="datetime" />
        </Form.Item>
        <Form.Item name="note" label="发货备注">
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
        <Form.Item name="items" initialValue={createDraftShipmentItems(orderItems)}>
          <OrderShipmentItemsPicker orderItems={orderItems} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
