'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { categoryStatusColors, categoryStatusLabels, categoryStatusOptions, formatAdminDate } from '@/lib/admin-display';
import type { AdminCategoryRow } from '@/server/admin/categories';

type CategoryFormValues = {
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  isFeatured: boolean;
  featuredOrder: number;
};

const initialValues: CategoryFormValues = {
  parentId: null as string | null,
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  seoTitle: '',
  seoDescription: '',
  status: 'active',
  sortOrder: 0,
  isFeatured: false,
  featuredOrder: 0,
};

export function AdminCategoriesClient({ initialRows }: { initialRows: AdminCategoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [form] = Form.useForm<CategoryFormValues>();

  const parentOptions = useMemo(
    () => rows.filter((item) => item.id !== editingId).map((item) => ({ value: item.id, label: item.name })),
    [editingId, rows],
  );

  async function reloadRows(nextSearch = search) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/categories${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminCategoryRow[] };
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

  function openEdit(row: AdminCategoryRow) {
    setEditingId(row.id);
    form.setFieldsValue({
      parentId: row.parentId,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? '',
      seoTitle: row.seoTitle ?? '',
      seoDescription: row.seoDescription ?? '',
      status: row.status,
      sortOrder: row.sortOrder,
      isFeatured: row.isFeatured ?? false,
      featuredOrder: row.featuredOrder ?? 0,
    });
    setOpen(true);
  }

  function handleSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          parentId: values.parentId || null,
          description: values.description || null,
          imageUrl: values.imageUrl || null,
          seoTitle: values.seoTitle || null,
          seoDescription: values.seoDescription || null,
        }),
      });

      if (response.ok) {
        closeModal();
        await reloadRows();
      }
    });
  }

  async function handleGenerateImage() {
    if (!editingId) {
      Modal.warning({ title: '请先保存分类' });
      return;
    }

    const name = form.getFieldValue('name');
    if (!name) {
      Modal.warning({ title: '请先输入分类名称' });
      return;
    }

    Modal.confirm({
      title: 'AI 生成图片',
      content: `将为「${name}」生成专业产品图片，是否继续？`,
      onOk: async () => {
        try {
          const response = await fetch('/api/admin/categories/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: editingId, name }),
          });

          const result = await response.json();
          if (response.ok) {
            Modal.success({
              title: '生成成功',
              content: '图片已生成并更新',
              onOk: () => {
                form.setFieldValue('imageUrl', result.imageUrl);
                reloadRows();
              },
            });
          } else {
            Modal.error({ title: '生成失败', content: result.error || '未知错误' });
          }
        } catch (error) {
          Modal.error({ title: '生成失败', content: String(error) });
        }
      },
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await reloadRows();
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>分类管理</Typography.Title>
          <Typography.Paragraph type="secondary">维护产品分类结构、排序、SEO 信息与上下级关系。</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建分类</Button>
      </Space>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索分类名称、Slug、描述"
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
          <Typography.Text type="secondary">共 {rows.length} 个分类</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 980 }}
          columns={[
            { title: '分类名称', dataIndex: 'name' },
            { title: 'Slug', dataIndex: 'slug' },
            { title: '上级分类', dataIndex: 'parentName', render: (value: string | null) => value ?? '顶级分类' },
            { title: '产品数', dataIndex: 'productCount' },
            { title: '排序', dataIndex: 'sortOrder' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: keyof typeof categoryStatusLabels) => (
                <Tag color={categoryStatusColors[value]}>{categoryStatusLabels[value]}</Tag>
              ),
            },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              render: (value: string | Date) => formatAdminDate(value),
            },
            {
              title: '操作',
              key: 'actions',
              fixed: 'right',
              render: (_, row: AdminCategoryRow) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Popconfirm title="确定删除该分类吗？" onConfirm={() => handleDelete(row.id)}>
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
        title={editingId ? '编辑分类' : '新建分类'}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="上级分类">
            <Select allowClear options={parentOptions} placeholder="不选择则为顶级分类" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="分类描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="imageUrl" label="分类图片 URL" extra={form.getFieldValue('imageUrl') ? <img src={form.getFieldValue('imageUrl')} alt="" style={{ marginTop: 8, maxWidth: 200 }} /> : null}>
            <Input addonAfter={editingId ? <Button type="link" onClick={handleGenerateImage}>AI 生成</Button> : null} />
          </Form.Item>
          <Form.Item name="isFeatured" label="推荐到首页" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="featuredOrder" label="首页展示顺序" extra="数字越小越靠前">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="seoTitle" label="SEO 标题">
            <Input />
          </Form.Item>
          <Form.Item name="seoDescription" label="SEO 描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}> 
            <Select options={categoryStatusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
