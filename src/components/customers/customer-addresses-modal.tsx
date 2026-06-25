'use client';

import { Empty, Modal, Space, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { formatAdminAddress, formatAdminDate, formatAdminSnapshotAddress } from '@/lib/admin-display';
import type {
  AdminCustomerAddressBookItem,
  AdminCustomerOrderAddressItem,
} from '@/server/admin/customers';

type CustomerAddressesModalProps = {
  open: boolean;
  customerId: string | null;
  customerName?: string;
  onClose: () => void;
};

type AddressPayload = {
  addressBook: AdminCustomerAddressBookItem[];
  orderSnapshots: AdminCustomerOrderAddressItem[];
};

export function CustomerAddressesModal({
  open,
  customerId,
  customerName,
  onClose,
}: CustomerAddressesModalProps) {
  const [data, setData] = useState<AddressPayload | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!open || !customerId) {
      setData(null);
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/customers/${customerId}/addresses`, { cache: 'no-store' });
      if (!response.ok) {
        messageApi.error('加载收货地址失败');
        return;
      }
      setData((await response.json()) as AddressPayload);
    });
  }, [open, customerId, messageApi]);

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={customerName ? `${customerName} · 收货地址` : '收货地址'}
        onCancel={onClose}
        footer={null}
        width={760}
        destroyOnHidden
      >
        {isPending && !data ? (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        ) : (
          <Tabs
            items={[
              {
                key: 'address_book',
                label: `地址簿 (${data?.addressBook.length ?? 0})`,
                children: data?.addressBook.length ? (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {data.addressBook.map((row) => (
                      <div key={row.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Space style={{ marginBottom: 8 }}>
                          <Typography.Text strong>{row.firstName} {row.lastName}</Typography.Text>
                          {row.isDefault ? <Tag color="blue">默认</Tag> : null}
                        </Space>
                        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {formatAdminAddress(row)}
                        </Typography.Paragraph>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Empty description="暂无地址簿记录" />
                ),
              },
              {
                key: 'order_snapshots',
                label: `订单快照 (${data?.orderSnapshots.length ?? 0})`,
                children: data?.orderSnapshots.length ? (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {data.orderSnapshots.map((row) => (
                      <div key={row.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Space style={{ marginBottom: 8 }} wrap>
                          <Typography.Text strong>订单 {row.orderNumber}</Typography.Text>
                          <Typography.Text type="secondary">{formatAdminDate(row.placedAt)}</Typography.Text>
                          <Tag>下单快照</Tag>
                        </Space>
                        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {formatAdminSnapshotAddress(row.snapshot)}
                        </Typography.Paragraph>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Empty description="暂无订单收货快照" />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </>
  );
}
