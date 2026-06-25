'use client';

import { Button, Drawer, Form, Input, InputNumber, Radio, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { CustomerMultiPicker } from '@/components/promotion/customer-multi-picker';
import {
  couponDistributionTargetModeLabels,
  couponGrantSourceLabels,
  formatAdminDate,
} from '@/lib/admin-display';
import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  type AdminCouponListItem,
  getCouponQuotaSummary,
} from '@/lib/coupon-list-query';

type CouponSendModalProps = {
  open: boolean;
  coupon: AdminCouponListItem | null;
  onClose: () => void;
  onSent: () => void;
};

type BatchItem = {
  id: string;
  targetMode: 'all_customers' | 'selected_customers';
  quantityPerUser: number;
  recipientCount: number;
  totalQuantity: number;
  note: string | null;
  createdAt: string;
  adminEmail: string;
};

type GrantItem = {
  id: string;
  quantity: number;
  source: 'admin_send' | 'registration' | 'self_claim';
  fullName: string;
  email: string;
  createdAt: string;
  adminEmail: string | null;
};

export function CouponSendModal({ open, coupon, onClose, onSent }: CouponSendModalProps) {
  const [form] = Form.useForm<{ targetMode: 'all_customers' | 'selected_customers'; userIds: string[]; quantityPerUser: number; note?: string }>();
  const targetMode = Form.useWatch('targetMode', form);
  const [isPending, startTransition] = useTransition();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchPage, setBatchPage] = useState(1);
  const [grantSource, setGrantSource] = useState<'' | 'admin_send' | 'registration'>('');
  const [grantDrawerOpen, setGrantDrawerOpen] = useState(false);
  const [grantBatchId, setGrantBatchId] = useState<string | null>(null);
  const [grants, setGrants] = useState<GrantItem[]>([]);
  const [grantTotal, setGrantTotal] = useState(0);
  const [grantPage, setGrantPage] = useState(1);

  const quota = coupon ? getCouponQuotaSummary(coupon) : null;

  const loadBatches = useCallback(async (page = 1) => {
    if (!coupon) return;
    const params = new URLSearchParams({ page: String(page), page_size: String(ADMIN_LIST_DEFAULT_PAGE_SIZE) });
    const response = await fetch(`/api/admin/coupons/${coupon.id}/distribution-batches?${params.toString()}`);
    if (!response.ok) return;
    const payload = (await response.json()) as {
      items: BatchItem[];
      meta: { total: number; page: number };
    };
    setBatches(payload.items.map((item) => ({ ...item, createdAt: String(item.createdAt) })));
    setBatchTotal(payload.meta.total);
    setBatchPage(payload.meta.page);
  }, [coupon]);

  const loadGrants = useCallback(async (page = 1, batchId?: string | null, source = grantSource) => {
    if (!coupon) return;
    const params = new URLSearchParams({ page: String(page), page_size: String(ADMIN_LIST_DEFAULT_PAGE_SIZE) });
    if (source) params.set('source', source);
    if (batchId) params.set('batch_id', batchId);
    const response = await fetch(`/api/admin/coupons/${coupon.id}/grants?${params.toString()}`);
    if (!response.ok) return;
    const payload = (await response.json()) as {
      items: GrantItem[];
      meta: { total: number; page: number };
    };
    setGrants(payload.items.map((item) => ({ ...item, createdAt: String(item.createdAt) })));
    setGrantTotal(payload.meta.total);
    setGrantPage(payload.meta.page);
  }, [coupon, grantSource]);

  useEffect(() => {
    if (!open || !coupon) return;
    form.setFieldsValue({
      targetMode: 'selected_customers',
      userIds: [],
      quantityPerUser: 1,
      note: '',
    });
    void loadBatches(1);
    void loadGrants(1, null, grantSource);
  }, [open, coupon, form, loadBatches, loadGrants, grantSource]);

  function submitSend() {
    if (!coupon) return;
    startTransition(async () => {
      const values = await form.validateFields();
      const response = await fetch(`/api/admin/coupons/${coupon.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMode: values.targetMode,
          userIds: values.targetMode === 'selected_customers' ? values.userIds : undefined,
          quantityPerUser: values.quantityPerUser,
          note: values.note,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        void message.error(payload?.error ?? '发放失败');
        return;
      }

      const result = (await response.json()) as { partial?: boolean; skippedUserIds?: string[] };
      void message.success(result.partial ? '部分客户发放成功' : '发放成功');
      if (result.skippedUserIds?.length) {
        void message.warning(`${result.skippedUserIds.length} 位客户因配额或限领规则被跳过`);
      }
      onSent();
      void loadBatches(1);
      void loadGrants(1, null, grantSource);
    });
  }

  function openBatchGrants(batchId: string) {
    setGrantBatchId(batchId);
    setGrantDrawerOpen(true);
    void loadGrants(1, batchId, '');
  }

  return (
    <>
      <Drawer
        open={open}
        width={920}
        title="发送至客户"
        onClose={onClose}
        destroyOnHidden
      >
        {coupon ? (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={5} style={{ marginBottom: 4 }}>{coupon.name}</Typography.Title>
              <Typography.Text type="secondary">{coupon.couponKey}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                剩余可发：
                <Tag color={quota?.exhausted ? 'red' : 'blue'}>
                  {quota?.remaining == null ? '不限' : `${quota.remaining} 张`}
                </Tag>
              </div>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item label="发放对象" name="targetMode" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="all_customers">{couponDistributionTargetModeLabels.all_customers}</Radio>
                  <Radio value="selected_customers">{couponDistributionTargetModeLabels.selected_customers}</Radio>
                </Radio.Group>
              </Form.Item>
              {targetMode === 'selected_customers' ? (
                <Form.Item name="userIds" rules={[{ required: true, message: '请选择至少一位客户' }]}>
                  <CustomerMultiPicker />
                </Form.Item>
              ) : null}
              <Form.Item label="每人张数" name="quantityPerUser" rules={[{ required: true }]}>
                <InputNumber min={1} precision={0} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label="备注" name="note">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Button type="primary" loading={isPending} onClick={submitSend}>
                确认发送
              </Button>
            </Form>

            <div>
              <Tabs
                activeKey={grantSource || 'all'}
                onChange={(key) => {
                  const next = key === 'all' ? '' : key as 'admin_send' | 'registration';
                  setGrantSource(next);
                  void loadGrants(1, null, next);
                }}
                items={[
                  { key: 'all', label: '全部来源' },
                  { key: 'admin_send', label: '管理员发放' },
                  { key: 'registration', label: '注册赠送' },
                ]}
              />
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={batches}
                columns={[
                  { title: '时间', dataIndex: 'createdAt', render: (value: string) => formatAdminDate(value) },
                  { title: '操作人', dataIndex: 'adminEmail' },
                  {
                    title: '对象',
                    dataIndex: 'targetMode',
                    render: (value: BatchItem['targetMode'], row: BatchItem) => (
                      value === 'all_customers'
                        ? couponDistributionTargetModeLabels.all_customers
                        : `指定 ${row.recipientCount} 人`
                    ),
                  },
                  { title: '每人', dataIndex: 'quantityPerUser', width: 72 },
                  { title: '触达', dataIndex: 'recipientCount', width: 72 },
                  { title: '总张数', dataIndex: 'totalQuantity', width: 80 },
                  {
                    title: '操作',
                    key: 'actions',
                    width: 88,
                    render: (_: unknown, row: BatchItem) => (
                      <Button type="link" size="small" onClick={() => openBatchGrants(row.id)}>
                        查看明细
                      </Button>
                    ),
                  },
                ]}
              />
              <AdminListPagination
                page={batchPage}
                pageSize={ADMIN_LIST_DEFAULT_PAGE_SIZE}
                total={batchTotal}
                onChange={({ page }) => {
                  void loadBatches(page);
                }}
              />
            </div>
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        open={grantDrawerOpen}
        width={720}
        title="发放明细"
        onClose={() => setGrantDrawerOpen(false)}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={grants}
          columns={[
            { title: '客户', dataIndex: 'fullName' },
            { title: '邮箱', dataIndex: 'email' },
            { title: '张数', dataIndex: 'quantity', width: 72 },
            {
              title: '来源',
              dataIndex: 'source',
              render: (value: GrantItem['source']) => couponGrantSourceLabels[value],
            },
            { title: '时间', dataIndex: 'createdAt', render: (value: string) => formatAdminDate(value) },
          ]}
        />
        <AdminListPagination
          page={grantPage}
          pageSize={ADMIN_LIST_DEFAULT_PAGE_SIZE}
          total={grantTotal}
          onChange={({ page }) => {
            void loadGrants(page, grantBatchId, grantSource);
          }}
        />
      </Drawer>
    </>
  );
}
