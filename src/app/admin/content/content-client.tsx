'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useState, useTransition } from 'react';

import {
  cmsStatusColors,
  cmsStatusLabels,
  cmsStatusOptions,
  contentStatusColors,
  contentStatusLabels,
  contentStatusOptions,
  formatAdminDate,
  toPrettyJson,
} from '@/lib/admin-display';
import type { AdminCmsPageRow, AdminContentBlockRow } from '@/server/admin/content';

type ContentBlockFormValues = {
  placement: string;
  blockKey: string;
  title: string;
  subtitle: string;
  contentText: string;
  status: 'active' | 'inactive';
  sortOrder: number;
};

type CmsPageFormValues = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string;
};

const initialBlockValues: ContentBlockFormValues = {
  placement: '',
  blockKey: '',
  title: '',
  subtitle: '',
  contentText: '{\n  \n}',
  status: 'active',
  sortOrder: 0,
};

const initialPageValues: CmsPageFormValues = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  seoTitle: '',
  seoDescription: '',
  status: 'draft',
  publishedAt: '',
};

function toLocalDateTimeValue(value: string | Date | null | undefined) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

export function AdminContentClient({
  initialBlocks,
  initialPages,
}: {
  initialBlocks: AdminContentBlockRow[];
  initialPages: AdminCmsPageRow[];
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [pages, setPages] = useState(initialPages);
  const [blockOpen, setBlockOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [blockSearch, setBlockSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [blockForm] = Form.useForm<ContentBlockFormValues>();
  const [pageForm] = Form.useForm<CmsPageFormValues>();

  async function reloadBlocks(nextSearch = blockSearch) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/content/blocks${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminContentBlockRow[] };
    setBlocks(payload.items ?? []);
  }

  async function reloadPages(nextSearch = pageSearch) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/content/pages${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminCmsPageRow[] };
    setPages(payload.items ?? []);
  }

  function closeBlockModal() {
    setBlockOpen(false);
    setEditingBlockId(null);
    blockForm.resetFields();
  }

  function closePageModal() {
    setPageOpen(false);
    setEditingPageId(null);
    pageForm.resetFields();
  }

  function openCreateBlock() {
    setEditingBlockId(null);
    blockForm.setFieldsValue(initialBlockValues);
    setBlockOpen(true);
  }

  function openEditBlock(row: AdminContentBlockRow) {
    setEditingBlockId(row.id);
    blockForm.setFieldsValue({
      placement: row.placement,
      blockKey: row.blockKey,
      title: row.title ?? '',
      subtitle: row.subtitle ?? '',
      contentText: toPrettyJson(row.content),
      status: row.status,
      sortOrder: row.sortOrder,
    });
    setBlockOpen(true);
  }

  function openCreatePage() {
    setEditingPageId(null);
    pageForm.setFieldsValue(initialPageValues);
    setPageOpen(true);
  }

  function openEditPage(row: AdminCmsPageRow) {
    setEditingPageId(row.id);
    pageForm.setFieldsValue({
      title: row.title,
      slug: row.slug,
      summary: row.summary ?? '',
      content: row.content ?? '',
      seoTitle: row.seoTitle ?? '',
      seoDescription: row.seoDescription ?? '',
      status: row.status,
      publishedAt: toLocalDateTimeValue(row.publishedAt),
    });
    setPageOpen(true);
  }

  function submitBlock(values: ContentBlockFormValues) {
    startTransition(async () => {
      let content: Record<string, unknown>;
      try {
        content = values.contentText.trim() ? (JSON.parse(values.contentText) as Record<string, unknown>) : {};
      } catch {
        blockForm.setFields([{ name: 'contentText', errors: ['内容 JSON 格式不正确'] }]);
        return;
      }

      const response = await fetch(editingBlockId ? `/api/admin/content/blocks/${editingBlockId}` : '/api/admin/content/blocks', {
        method: editingBlockId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placement: values.placement,
          blockKey: values.blockKey,
          title: values.title || null,
          subtitle: values.subtitle || null,
          content,
          status: values.status,
          sortOrder: values.sortOrder,
        }),
      });

      if (response.ok) {
        closeBlockModal();
        await reloadBlocks();
      }
    });
  }

  function submitPage(values: CmsPageFormValues) {
    startTransition(async () => {
      const response = await fetch(editingPageId ? `/api/admin/content/pages/${editingPageId}` : '/api/admin/content/pages', {
        method: editingPageId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          slug: values.slug,
          summary: values.summary || null,
          content: values.content || null,
          seoTitle: values.seoTitle || null,
          seoDescription: values.seoDescription || null,
          status: values.status,
          publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
        }),
      });

      if (response.ok) {
        closePageModal();
        await reloadPages();
      }
    });
  }

  function deleteBlock(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/content/blocks/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await reloadBlocks();
      }
    });
  }

  function deletePage(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/content/pages/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await reloadPages();
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>内容管理</Typography.Title>
        <Typography.Paragraph type="secondary">统一管理首页内容区块与 CMS 页面，满足工业品商城的内容运营与 SEO 维护需要。</Typography.Paragraph>
      </div>

      <Tabs
        items={[
          {
            key: 'blocks',
            label: '内容区块',
            children: (
              <Card>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
                  <Space wrap>
                    <Input.Search
                      placeholder="搜索 placement、key、标题"
                      allowClear
                      value={blockSearch}
                      onChange={(event) => setBlockSearch(event.target.value)}
                      onSearch={(value) => {
                        setBlockSearch(value);
                        startTransition(async () => {
                          await reloadBlocks(value);
                        });
                      }}
                      style={{ maxWidth: 320 }}
                    />
                    <Typography.Text type="secondary">共 {blocks.length} 个区块</Typography.Text>
                  </Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateBlock}>新建区块</Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={isPending}
                  dataSource={blocks}
                  pagination={false}
                  scroll={{ x: 980 }}
                  columns={[
                    { title: '位置', dataIndex: 'placement' },
                    { title: '区块 Key', dataIndex: 'blockKey' },
                    { title: '标题', dataIndex: 'title', render: (value: string | null) => value ?? '未填写' },
                    { title: '排序', dataIndex: 'sortOrder' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (value: keyof typeof contentStatusLabels) => (
                        <Tag color={contentStatusColors[value]}>{contentStatusLabels[value]}</Tag>
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
                      render: (_, row: AdminContentBlockRow) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openEditBlock(row)} />
                          <Popconfirm title="确定删除该内容区块吗？" onConfirm={() => deleteBlock(row.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'pages',
            label: 'CMS 页面',
            children: (
              <Card>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
                  <Space wrap>
                    <Input.Search
                      placeholder="搜索页面标题、Slug、摘要"
                      allowClear
                      value={pageSearch}
                      onChange={(event) => setPageSearch(event.target.value)}
                      onSearch={(value) => {
                        setPageSearch(value);
                        startTransition(async () => {
                          await reloadPages(value);
                        });
                      }}
                      style={{ maxWidth: 320 }}
                    />
                    <Typography.Text type="secondary">共 {pages.length} 个页面</Typography.Text>
                  </Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreatePage}>新建页面</Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={isPending}
                  dataSource={pages}
                  pagination={false}
                  scroll={{ x: 980 }}
                  columns={[
                    { title: '页面标题', dataIndex: 'title' },
                    { title: 'Slug', dataIndex: 'slug' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (value: keyof typeof cmsStatusLabels) => (
                        <Tag color={cmsStatusColors[value]}>{cmsStatusLabels[value]}</Tag>
                      ),
                    },
                    {
                      title: '发布时间',
                      dataIndex: 'publishedAt',
                      render: (value: string | Date | null) => formatAdminDate(value),
                    },
                    {
                      title: '更新时间',
                      dataIndex: 'updatedAt',
                      render: (value: string | Date) => formatAdminDate(value),
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: AdminCmsPageRow) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openEditPage(row)} />
                          <Popconfirm title="确定删除该页面吗？" onConfirm={() => deletePage(row.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={blockOpen}
        title={editingBlockId ? '编辑内容区块' : '新建内容区块'}
        onCancel={closeBlockModal}
        onOk={() => blockForm.submit()}
        confirmLoading={isPending}
        width={720}
        destroyOnHidden
      >
        <Form form={blockForm} layout="vertical" initialValues={initialBlockValues} onFinish={submitBlock}>
          <Space style={{ width: '100%' }}>
            <Form.Item name="placement" label="位置标识" rules={[{ required: true, message: '请输入位置标识' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="blockKey" label="区块 Key" rules={[{ required: true, message: '请输入区块 Key' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="title" label="标题">
            <Input />
          </Form.Item>
          <Form.Item name="subtitle" label="副标题">
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}> 
            <Select options={contentStatusOptions} />
          </Form.Item>
          <Form.Item name="contentText" label="内容 JSON" rules={[{ required: true, message: '请输入内容 JSON' }]}>
            <Input.TextArea rows={10} spellCheck={false} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={pageOpen}
        title={editingPageId ? '编辑 CMS 页面' : '新建 CMS 页面'}
        onCancel={closePageModal}
        onOk={() => pageForm.submit()}
        confirmLoading={isPending}
        width={760}
        destroyOnHidden
      >
        <Form form={pageForm} layout="vertical" initialValues={initialPageValues} onFinish={submitPage}>
          <Space style={{ width: '100%' }}>
            <Form.Item name="title" label="页面标题" rules={[{ required: true, message: '请输入页面标题' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="content" label="正文内容">
            <Input.TextArea rows={8} />
          </Form.Item>
          <Form.Item name="seoTitle" label="SEO 标题">
            <Input />
          </Form.Item>
          <Form.Item name="seoDescription" label="SEO 描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}> 
            <Select options={cmsStatusOptions} />
          </Form.Item>
          <Form.Item name="publishedAt" label="发布时间">
            <Input placeholder="2026-05-31T10:00" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
