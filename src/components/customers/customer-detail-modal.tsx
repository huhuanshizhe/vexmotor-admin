'use client';

import { Descriptions, Form, Input, Modal, Space, Tag, Typography, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import {
  formatAdminAddress,
  formatAdminDate,
  formatAdminMoney,
  userRoleColors,
  userRoleLabels,
  userStatusColors,
  userStatusLabels,
} from '@/lib/admin-display';
import { formatCustomerIndustryLabel } from '@/lib/customer-industries';
import type { AdminCustomerDetail } from '@/server/admin/customers';

type CustomerDetailModalProps = {
  open: boolean;
  customerId: string | null;
  onClose: () => void;
  onSaved?: (detail: AdminCustomerDetail) => void;
};

export function CustomerDetailModal({ open, customerId, onClose, onSaved }: CustomerDetailModalProps) {
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<{ internalNote: string }>();

  useEffect(() => {
    if (!open || !customerId) {
      setDetail(null);
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/customers/${customerId}`, { cache: 'no-store' });
      if (!response.ok) {
        messageApi.error('加载客户详情失败');
        return;
      }
      const payload = (await response.json()) as AdminCustomerDetail;
      setDetail(payload);
      form.setFieldsValue({ internalNote: payload.internalNote ?? '' });
    });
  }, [open, customerId, form, messageApi]);

  function saveInternalNote() {
    if (!customerId) return;
    form.validateFields().then((values) => {
      startTransition(async () => {
        const response = await fetch(`/api/admin/customers/${customerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internalNote: values.internalNote.trim() || null }),
        });
        if (!response.ok) {
          messageApi.error('保存失败');
          return;
        }
        const nextDetail = (await response.json()) as AdminCustomerDetail;
        setDetail(nextDetail);
        onSaved?.(nextDetail);
        messageApi.success('保存成功');
        onClose();
      });
    });
  }

  const companyAddress = detail
    ? formatAdminAddress({
        addressLine1: detail.companyAddressLine1 ?? '—',
        addressLine2: detail.companyAddressLine2,
        city: detail.companyCity ?? '—',
        state: detail.companyState,
        postalCode: detail.companyPostalCode,
        countryCode: detail.companyCountryCode ?? '—',
      })
    : '—';

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title="客户详情"
        onCancel={onClose}
        onOk={saveInternalNote}
        okText="保存备注"
        confirmLoading={isPending}
        width={760}
        destroyOnHidden
      >
        {!detail ? (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="账户" column={2} size="small" bordered>
              <Descriptions.Item label="邮箱">{detail.email}</Descriptions.Item>
              <Descriptions.Item label="姓名">{detail.firstName} {detail.lastName}</Descriptions.Item>
              <Descriptions.Item label="电话">{detail.phone ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="角色">
                <Tag color={userRoleColors[detail.role]}>{userRoleLabels[detail.role]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={userStatusColors[detail.status]}>{userStatusLabels[detail.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">{formatAdminDate(detail.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="邮箱验证">{formatAdminDate(detail.emailVerifiedAt)}</Descriptions.Item>
              <Descriptions.Item label="最近登录">{formatAdminDate(detail.lastLoginAt)}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="公司" column={2} size="small" bordered>
              <Descriptions.Item label="公司名">{detail.company ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="职位">{detail.jobTitle ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="行业">{formatCustomerIndustryLabel(detail.industry)}</Descriptions.Item>
              <Descriptions.Item label="规模">{detail.companySize ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="网站">{detail.website ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="税号">{detail.taxId ?? '未填写'}</Descriptions.Item>
              <Descriptions.Item label="公司地址" span={2}>
                <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{companyAddress}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="交易摘要" column={3} size="small" bordered>
              <Descriptions.Item label="订单数">{detail.orderCount}</Descriptions.Item>
              <Descriptions.Item label="成交额">{formatAdminMoney(detail.totalSpent)}</Descriptions.Item>
              <Descriptions.Item label="询盘数">{detail.inquiryCount}</Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Typography.Title level={5} style={{ marginTop: 0 }}>内部备注</Typography.Title>
              <Form.Item name="internalNote">
                <Input.TextArea rows={4} placeholder="仅后台可见的管理员备注" />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </>
  );
}
