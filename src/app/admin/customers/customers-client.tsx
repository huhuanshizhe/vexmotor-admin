'use client';

import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import {
  formatAdminDate,
  formatAdminMoney,
  userRoleColors,
  userRoleLabels,
  userRoleOptions,
  userStatusColors,
  userStatusLabels,
  userStatusOptions,
} from '@/lib/admin-display';
import type { AdminCustomerRow } from '@/server/admin/customers';

type CustomerFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  avatarUrl: string;
  role: 'customer' | 'staff' | 'admin';
  status: 'active' | 'disabled' | 'pending';
};

const initialValues: CustomerFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  avatarUrl: '',
  role: 'customer',
  status: 'pending',
};

export function AdminCustomersClient({ initialRows }: { initialRows: AdminCustomerRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [form] = Form.useForm<CustomerFormValues>();

  const metrics = useMemo(() => ({
    active: rows.filter((item) => item.status === 'active').length,
    pending: rows.filter((item) => item.status === 'pending').length,
    admins: rows.filter((item) => item.role === 'admin').length,
    revenue: rows.reduce((sum, item) => sum + item.totalSpent, 0),
  }), [rows]);

  async function reloadRows(nextSearch = search) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/customers${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminCustomerRow[] };
    setRows(payload.items ?? []);
  }

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    form.resetFields();
  }

  function openCreate() {
    setEditingId(null);
    form.setFieldsValue(initialValues);
    setOpen(true);
  }

  function openEdit(row: AdminCustomerRow) {
    setEditingId(row.id);
    form.setFieldsValue({
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company ?? '',
      phone: row.phone ?? '',
      avatarUrl: row.avatarUrl ?? '',
      role: row.role,
      status: row.status,
    });
    setOpen(true);
  }

  function handleSubmit(values: CustomerFormValues) {
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/admin/customers/${editingId}` : '/api/admin/customers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          company: values.company || null,
          phone: values.phone || null,
          avatarUrl: values.avatarUrl || null,
        }),
      });

      if (response.ok) {
        closeModal();
        await reloadRows();
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>客户管理</Typography.Title>
          <Typography.Paragraph type="secondary">统一维护客户账户、内部角色、审核状态与成交数据。</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建账户</Button>
      </Space>

      <Space size="middle" wrap>
        <Card><Statistic title="正常账户" value={metrics.active} /></Card>
        <Card><Statistic title="待审核账户" value={metrics.pending} /></Card>
        <Card><Statistic title="管理员/员工" value={metrics.admins} /></Card>
        <Card><Statistic title="累计成交额" value={metrics.revenue} precision={2} prefix="$" /></Card>
      </Space>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索姓名、邮箱、公司、电话"
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => {
              setSearch(value);
              startTransition(async () => {
                await reloadRows(value);
              });
            }}
            style={{ maxWidth: 360 }}
          />
          <Typography.Text type="secondary">共 {rows.length} 个账户</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1280 }}
          columns={[
            {
              title: '客户',
              key: 'customer',
              render: (_, row: AdminCustomerRow) => (
                <div>
                  <div>{row.firstName} {row.lastName}</div>
                  <Typography.Text type="secondary">{row.email}</Typography.Text>
                </div>
              ),
            },
            { title: '公司', dataIndex: 'company', render: (value: string | null) => value ?? '未填写' },
            {
              title: '角色',
              dataIndex: 'role',
              render: (value: keyof typeof userRoleLabels) => <Tag color={userRoleColors[value]}>{userRoleLabels[value]}</Tag>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: keyof typeof userStatusLabels) => <Tag color={userStatusColors[value]}>{userStatusLabels[value]}</Tag>,
            },
            { title: '订单', dataIndex: 'orderCount' },
            { title: '询盘', dataIndex: 'inquiryCount' },
            { title: '地址', dataIndex: 'addressCount' },
            { title: '收藏', dataIndex: 'wishlistCount' },
            {
              title: '成交额',
              dataIndex: 'totalSpent',
              render: (value: number) => formatAdminMoney(value),
            },
            {
              title: '最近登录',
              dataIndex: 'lastLoginAt',
              render: (value: string | Date | null) => formatAdminDate(value),
            },
            {
              title: '操作',
              key: 'actions',
              fixed: 'right',
              render: (_, row: AdminCustomerRow) => <Button icon={<EditOutlined />} onClick={() => openEdit(row)} />,
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title={editingId ? '编辑账户' : '新建账户'}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="firstName" label="名" rules={[{ required: true, message: '请输入名' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="姓" rules={[{ required: true, message: '请输入姓' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="company" label="公司名称">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="avatarUrl" label="头像 URL">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}> 
            <Select options={userRoleOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}> 
            <Select options={userStatusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
