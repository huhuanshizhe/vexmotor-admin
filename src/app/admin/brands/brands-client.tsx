'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState, useTransition } from 'react';

import { brandStatusColors, brandStatusLabels, brandStatusOptions, formatAdminDate } from '@/lib/admin-display';
import type { AdminBrandRow } from '@/server/admin/brands';

type BrandFormValues = {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  status: 'active' | 'inactive';
};

const initialValues: BrandFormValues = {
  name: '',
  slug: '',
  description: '',
  logoUrl: '',
  websiteUrl: '',
  status: 'active',
};

export function AdminBrandsClient({ initialRows }: { initialRows: AdminBrandRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [form] = Form.useForm<BrandFormValues>();

  async function reloadRows(nextSearch = search) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/brands${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminBrandRow[] };
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

  function openEdit(row: AdminBrandRow) {
    setEditingId(row.id);
    form.setFieldsValue({
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      logoUrl: row.logoUrl ?? '',
      websiteUrl: row.websiteUrl ?? '',
      status: row.status,
    });
    setOpen(true);
  }

  function handleSubmit(values: BrandFormValues) {
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/admin/brands/${editingId}` : '/api/admin/brands', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          description: values.description || null,
          logoUrl: values.logoUrl || null,
          websiteUrl: values.websiteUrl || null,
        }),
      });

      if (response.ok) {
        closeModal();
        await reloadRows();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await reloadRows();
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>品牌管理</Typography.Title>
          <Typography.Paragraph type="secondary">维护品牌资料、官网链接与产品挂载关系。</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建品牌</Button>
      </Space>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索品牌名称、Slug、描述"
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
          <Typography.Text type="secondary">共 {rows.length} 个品牌</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 920 }}
          columns={[
            { title: '品牌名称', dataIndex: 'name' },
            { title: 'Slug', dataIndex: 'slug' },
            { title: '挂载产品', dataIndex: 'productCount' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: keyof typeof brandStatusLabels) => (
                <Tag color={brandStatusColors[value]}>{brandStatusLabels[value]}</Tag>
              ),
            },
            {
              title: '官网链接',
              dataIndex: 'websiteUrl',
              render: (value: string | null) => value ?? '未填写',
            },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              render: (value: string | Date) => formatAdminDate(value),
            },
            {
              title: '操作',
              key: 'actions',
              render: (_, row: AdminBrandRow) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Popconfirm title="确定删除该品牌吗？" onConfirm={() => handleDelete(row.id)}>
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title={editingId ? '编辑品牌' : '新建品牌'}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
          <Form.Item name="name" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="websiteUrl" label="官网链接">
            <Input />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo URL">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="品牌描述">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}> 
            <Select options={brandStatusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
