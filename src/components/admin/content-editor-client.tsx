'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined, TranslationOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useCallback, useState, useTransition } from 'react';

type ContentType = 'faq' | 'glossary' | 'support' | 'solution';

const contentTypeLabels: Record<ContentType, string> = { faq: 'FAQ', glossary: 'Glossary', support: 'Support', solution: 'Solution' };

type ContentRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category?: string;
  locale: string;
};

export function ContentEditorClient({
  initialRows,
  contentType,
}: {
  initialRows: ContentRow[];
  contentType: ContentType;
}) {
  const [rows, setRows] = useState<ContentRow[]>(initialRows);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form] = Form.useForm();
  const label = contentTypeLabels[contentType];

  async function reloadRows() {
    const res = await fetch(`/api/admin/content/${contentType}`);
    const data = await res.json() as { items: ContentRow[] };
    setRows(data.items ?? []);
  }

  function openCreate() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ title: '', slug: '', category: '', status: 'draft', locale: 'en' });
    setOpen(true);
  }

  function openEdit(row: ContentRow) {
    setEditingId(row.id);
    form.setFieldsValue(row);
    setOpen(true);
  }

  function handleSubmit(values: Record<string, string>) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/content/${contentType}${editingId ? `?id=${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) { form.resetFields(); setOpen(false); setEditingId(null); await reloadRows(); }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/content/${contentType}?id=${id}`, { method: 'DELETE' });
      await reloadRows();
    });
  }

  async function handleAiTranslate() {
    const title = form.getFieldValue('title');
    const summary = form.getFieldValue('summary');
    const content = form.getFieldValue('content');
    const targetLocale = form.getFieldValue('locale') || 'en';
    if (targetLocale === 'en') { message.info('English is the source language, no translation needed'); return; }
    if (!title && !summary && !content) { message.warning('No content to translate'); return; }

    message.loading({ content: 'AI translating...', key: 'ai-translate' });
    try {
      const fields = ['title', 'summary', 'content'] as const;
      for (const field of fields) {
        const text = form.getFieldValue(field);
        if (!text) continue;
        const res = await fetch('/api/admin/ai/translate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sourceLocale: 'en', targetLocale, context: contentType }),
        });
        if (res.ok) {
          const data = await res.json() as { translatedText?: string };
          if (data.translatedText) form.setFieldValue(field, data.translatedText);
        }
      }
      message.success({ content: 'AI translation complete - please review', key: 'ai-translate' });
    } catch {
      message.error({ content: 'AI translation failed', key: 'ai-translate' });
    }
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={2}>{label} 管理</Typography.Title>
          <Typography.Paragraph type="secondary">管理{label}内容条目，包括标题、内容、SEO 字段和发布状态。</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建{label}</Button>
      </Space>

      <Card>
        <Table
          rowKey="id"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          columns={[
            { title: '标题', dataIndex: 'title' },
            { title: 'Slug', dataIndex: 'slug' },
            contentType === 'faq' ? { title: '分类', dataIndex: 'category', render: (v: string) => v || '-' } : {},
            { title: '语言', dataIndex: 'locale', render: (v: string) => <Tag>{v}</Tag> },
            { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'published' ? 'green' : 'orange'}>{v}</Tag> },
            {
              title: '操作', key: 'actions',
              render: (_: unknown, row: ContentRow) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(row.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm>
                </Space>
              ),
            },
          ].filter(Boolean)}
        />
      </Card>

      <Modal
        open={open}
        onCancel={() => { setOpen(false); setEditingId(null); }}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        title={editingId ? `编辑${label}` : `新建${label}`}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          {contentType === 'faq' ? (
            <Form.Item name="category" label="分类"><Select options={[
              { value: 'General', label: 'General' }, { value: 'Stepper', label: 'Stepper' },
              { value: 'BLDC', label: 'BLDC' }, { value: 'Servo', label: 'Servo' },
              { value: 'Drivers', label: 'Drivers' }, { value: 'Wiring', label: 'Wiring' },
              { value: 'Sizing', label: 'Sizing' }, { value: 'Compliance', label: 'Compliance' },
              { value: 'Shipping', label: 'Shipping' },
            ]} /></Form.Item>
          ) : null}
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="content" label="内容"><Input.TextArea rows={6} /></Form.Item>
          <Form.Item name="locale" label="语言" rules={[{ required: true }]}>
            <Select options={[{ value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }, { value: 'fr', label: 'Français' }, { value: 'es', label: 'Español' }]} />
          </Form.Item>
          <Form.Item>
            <Button icon={<TranslationOutlined />} onClick={handleAiTranslate} block>AI 翻译</Button>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
