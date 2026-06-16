'use client';

import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useCallback, useState, useTransition } from 'react';

import {
  formatAdminMoney,
  productStatusColors,
  productStatusLabels,
  productStatusOptions,
  purchaseModeColors,
  purchaseModeLabels,
  purchaseModeOptions,
} from '@/lib/admin-display';
import type { AdminProductRow } from '@/server/admin/products';

const initialValues = {
  name: '',
  slug: '',
  sku: '',
  purchaseMode: 'buy',
  status: 'draft',
  price: 0,
  compareAtPrice: null as number | null,
  shortDescription: '',
  description: '',
  currencyCode: 'USD',
  stockQuantity: 0,
  moq: 1,
  leadTimeMin: 3,
  leadTimeMax: 15,
  leadTimeUnit: 'business_days',
  lifecycleStatus: 'active',
  eolDate: null as string | null,
  lastTimeBuyDate: null as string | null,
  efficiencyClass: null as string | null,
  certifications: [] as string[],
  configurationRules: null as unknown | null,
  torqueCurveData: null as unknown | null,
  paidSampleEnabled: false,
  featured: false,
  brandId: null as string | null,
  defaultCategoryId: null as string | null,
  seoTitle: '',
  seoDescription: '',
  images: [] as Array<{ url: string; alt: string; width: number | null; height: number | null; isPrimary: boolean }>,
  features: [] as Array<{ featureKey: string; featureValue: string; featureValueMin: number | null; featureValueMax: number | null; valueType: string; unit: string | null; specCategory: string }>,
  attachments: [] as Array<{ name: string; url: string; mimeType: string }>,
  compatibleProducts: [] as Array<{ relatedProductId: string; relationType: string; relationLabel: string | null }>,
};

type OptionItem = { label: string; value: string };

export function AdminProductsClient({
  initialRows,
  brandOptions,
  categoryOptions,
}: {
  initialRows: AdminProductRow[];
  brandOptions: OptionItem[];
  categoryOptions: OptionItem[];
}) {
  const [rows, setRows] = useState<AdminProductRow[]>(initialRows);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [form] = Form.useForm<typeof initialValues>();
  const [productSearchOptions, setProductSearchOptions] = useState<OptionItem[]>([]);
  const [translationLocale, setTranslationLocale] = useState('de');
  const [translationFields, setTranslationFields] = useState<Record<string, string>>({ name: '', shortDescription: '', description: '', seoTitle: '', seoDescription: '' });
  const [, setTranslationPending] = useState(false);

  async function loadTranslation(productId: string, locale: string) {
    setTranslationLocale(locale);
    try {
      const res = await fetch(`/api/admin/products/${productId}/translations`);
      const data = (await res.json()) as Array<{ locale: string; name?: string | null; shortDescription?: string | null; description?: string | null; seoTitle?: string | null; seoDescription?: string | null }>;
      const found = data.find((t) => t.locale === locale);
      setTranslationFields({
        name: found?.name ?? '',
        shortDescription: found?.shortDescription ?? '',
        description: found?.description ?? '',
        seoTitle: found?.seoTitle ?? '',
        seoDescription: found?.seoDescription ?? '',
      });
    } catch {
      setTranslationFields({ name: '', shortDescription: '', description: '', seoTitle: '', seoDescription: '' });
    }
  }

  async function saveTranslation() {
    if (!editingId) return;
    setTranslationPending(true);
    try {
      await fetch(`/api/admin/products/${editingId}/translations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: translationLocale, ...translationFields }),
      });
    } finally {
      setTranslationPending(false);
    }
  }

  async function aiTranslateFields() {
    if (!editingId) return;
    // Get current English product data as source
    const englishName = form.getFieldValue('name') || '';
    const englishShort = form.getFieldValue('shortDescription') || '';
    const englishDesc = form.getFieldValue('description') || '';
    const englishSeoTitle = form.getFieldValue('seoTitle') || '';
    const englishSeoDesc = form.getFieldValue('seoDescription') || '';

    const fields = [
      { key: 'name', text: englishName },
      { key: 'shortDescription', text: englishShort },
      { key: 'description', text: englishDesc },
      { key: 'seoTitle', text: englishSeoTitle },
      { key: 'seoDescription', text: englishSeoDesc },
    ].filter((f) => f.text.trim());

    if (!fields.length) return;

    setTranslationPending(true);
    const newFields = { ...translationFields };
    try {
      for (const field of fields) {
        const res = await fetch('/api/admin/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: field.text, sourceLocale: 'en', targetLocale: translationLocale, context: 'product' }),
        });
        if (res.ok) {
          const data = await res.json() as { translatedText?: string };
          if (data.translatedText) newFields[field.key] = data.translatedText;
        }
      }
      setTranslationFields(newFields);
    } finally {
      setTranslationPending(false);
    }
  }

  const handleProductSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) return;
      const params = new URLSearchParams({ q: query });
      if (editingId) params.set('excludeId', editingId);
      try {
        const res = await fetch(`/api/admin/products/search?${params}`);
        const data = (await res.json()) as { items: Array<{ id: string; name: string; sku: string }> };
        setProductSearchOptions(
          data.items.map((item) => ({ value: item.id, label: `${item.name} (${item.sku})` })),
        );
      } catch {
        // ignore
      }
    },
    [editingId],
  );

  async function reloadRows(nextSearch = search) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/products${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: AdminProductRow[] };
    setRows(payload.items ?? []);
  }

  function openCreate() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(initialValues);
    setOpen(true);
  }

  function openEdit(row: AdminProductRow) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${row.id}`, { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const detail = (await response.json()) as AdminProductRow & {
        seoTitle: string | null;
        seoDescription: string | null;
        images: Array<{ url: string; alt: string; width: number | null; height: number | null; isPrimary: boolean }>;
        features: Array<{ featureKey: string; featureValue: string; featureValueMin: number | null; featureValueMax: number | null; valueType: string; unit: string | null; specCategory: string }>;
        attachments: Array<{ name: string; url: string; mimeType: string }>;
        compatibleProducts: Array<{ id: string; relatedProductId: string; relatedProductName: string; relationType: string; relationLabel: string | null }>;
      };

      setEditingId(row.id);
      form.setFieldsValue({
        name: detail.name,
        slug: detail.slug,
        sku: detail.sku,
        purchaseMode: detail.purchaseMode,
        status: detail.status,
        price: Number(detail.price),
        compareAtPrice: detail.compareAtPrice == null ? null : Number(detail.compareAtPrice),
        shortDescription: detail.shortDescription ?? '',
        description: detail.description ?? '',
        currencyCode: detail.currencyCode,
        stockQuantity: detail.stockQuantity,
        moq: detail.moq ?? 1,
        leadTimeMin: detail.leadTimeMin ?? 3,
        leadTimeMax: detail.leadTimeMax ?? 15,
        leadTimeUnit: detail.leadTimeUnit ?? 'business_days',
        lifecycleStatus: detail.lifecycleStatus ?? 'active',
        eolDate: detail.eolDate ? detail.eolDate.slice(0, 10) : null,
        lastTimeBuyDate: detail.lastTimeBuyDate ? detail.lastTimeBuyDate.slice(0, 10) : null,
        efficiencyClass: detail.efficiencyClass ?? null,
        certifications: detail.certifications ?? [],
        configurationRules: detail.configurationRules ?? null,
        torqueCurveData: detail.torqueCurveData ?? null,
        paidSampleEnabled: detail.paidSampleEnabled ?? false,
        featured: detail.featured,
        brandId: detail.brandId,
        defaultCategoryId: detail.defaultCategoryId,
        seoTitle: detail.seoTitle ?? '',
        seoDescription: detail.seoDescription ?? '',
        images: detail.images,
        features: detail.features,
        attachments: detail.attachments,
        compatibleProducts: (detail.compatibleProducts ?? []).map((item) => ({
          relatedProductId: item.relatedProductId,
          relationType: item.relationType,
          relationLabel: item.relationLabel,
        })),
      });
      setOpen(true);
      loadTranslation(row.id, 'de');
    });
  }

  function handleSubmit(values: typeof initialValues) {
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/admin/products/${editingId}` : '/api/admin/products', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        form.resetFields();
        setOpen(false);
        setEditingId(null);
        await reloadRows();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await reloadRows();
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={2}>产品管理</Typography.Title>
          <Typography.Paragraph type="secondary">
            维护产品基础信息、购买模式、库存、图册、规格特性与资料附件。数据库不可用时会自动回退到内存数据，便于本地联调。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建产品
        </Button>
      </Space>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索产品名称、SKU、Slug"
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
          <Typography.Text type="secondary">共 {rows.length} 个产品</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1100 }}
          columns={[
            { title: '产品名称', dataIndex: 'name' },
            { title: 'SKU', dataIndex: 'sku' },
            { title: '品牌', dataIndex: 'brandName', render: (value: string | null) => value ?? '未分配' },
            { title: '默认分类', dataIndex: 'categoryName', render: (value: string | null) => value ?? '未分配' },
            {
              title: '购买模式',
              dataIndex: 'purchaseMode',
              render: (value: keyof typeof purchaseModeLabels) => (
                <Tag color={purchaseModeColors[value]}>{purchaseModeLabels[value]}</Tag>
              ),
            },
            { title: '库存', dataIndex: 'stockQuantity' },
            {
              title: '单价',
              dataIndex: 'price',
              render: (value: string, row: AdminProductRow) => formatAdminMoney(value, row.currencyCode),
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: keyof typeof productStatusLabels) => (
                <Tag color={productStatusColors[value]}>{productStatusLabels[value]}</Tag>
              ),
            },
            {
              title: '生命周期',
              dataIndex: 'lifecycleStatus',
              render: (value: string) => {
                const lifecycleLabels: Record<string, string> = {
                  new: '新品',
                  active: '在售',
                  nfd: '停售通知',
                  eol: '停产',
                  last_time_buy: '最后购买',
                };
                const lifecycleColors: Record<string, string> = {
                  new: 'blue',
                  active: 'green',
                  nfd: 'orange',
                  eol: 'red',
                  last_time_buy: 'volcano',
                };
                return <Tag color={lifecycleColors[value] || 'default'}>{lifecycleLabels[value] || value}</Tag>;
              },
            },
            {
              title: '操作',
              key: 'actions',
              render: (_, row: AdminProductRow) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Popconfirm title="确定删除该产品吗？" onConfirm={() => handleDelete(row.id)}>
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
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        title={editingId ? '编辑产品' : '新建产品'}
      >
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
          <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sku" label="SKU" rules={[{ required: true, message: '请输入 SKU' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shortDescription" label="简短描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="description" label="详细描述">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="seoTitle" label="SEO 标题">
            <Input />
          </Form.Item>
          <Form.Item name="seoDescription" label="SEO 描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="purchaseMode" label="购买模式" rules={[{ required: true }]}>
            <Select options={purchaseModeOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={productStatusOptions} />
          </Form.Item>
          <Form.Item name="price" label="销售价" rules={[{ required: true, message: '请输入销售价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="compareAtPrice" label="划线价">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="currencyCode" label="币种" rules={[{ required: true }]}>
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'CNY', label: 'CNY' }]} />
          </Form.Item>
          <Form.Item name="stockQuantity" label="库存数量" rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Divider>库存与交期</Divider>
          <Form.Item name="moq" label="最小起订量 (MOQ)">
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="leadTimeMin" label="最短交期" style={{ flex: 1 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="leadTimeMax" label="最长交期" style={{ flex: 1 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="leadTimeUnit" label="交期单位" style={{ flex: 1 }}>
              <Select
                options={[
                  { value: 'business_days', label: '工作日' },
                  { value: 'calendar_days', label: '自然日' },
                  { value: 'weeks', label: '周' },
                ]}
              />
            </Form.Item>
          </Space>

          <Divider>生命周期与认证</Divider>
          <Form.Item name="lifecycleStatus" label="生命周期状态">
            <Select
              options={[
                { value: 'new', label: '新品 (New)' },
                { value: 'active', label: '在售 (Active)' },
                { value: 'nfd', label: '停售通知 (NFD)' },
                { value: 'eol', label: '停产 (EOL)' },
                { value: 'last_time_buy', label: '最后购买机会 (Last Time Buy)' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.lifecycleStatus !== cur.lifecycleStatus}>
            {({ getFieldValue }) => {
              const status = getFieldValue('lifecycleStatus');
              if (status === 'eol' || status === 'last_time_buy') {
                return (
                  <Form.Item name="eolDate" label="EOL 日期">
                    <Input type="date" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.lifecycleStatus !== cur.lifecycleStatus}>
            {({ getFieldValue }) => {
              const status = getFieldValue('lifecycleStatus');
              if (status === 'last_time_buy') {
                return (
                  <Form.Item name="lastTimeBuyDate" label="最后购买截止日期">
                    <Input type="date" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item name="efficiencyClass" label="能效等级">
            <Select
              allowClear
              options={[
                { value: 'IE1', label: 'IE1' },
                { value: 'IE2', label: 'IE2' },
                { value: 'IE3', label: 'IE3' },
                { value: 'IE4', label: 'IE4' },
                { value: 'IE5', label: 'IE5' },
              ]}
            />
          </Form.Item>
          <Form.Item name="certifications" label="认证">
            <Select mode="tags" placeholder="输入认证名称后按回车" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="torqueCurveData" label="扭矩曲线数据 (JSON)">
            <Input.TextArea rows={5} placeholder='{"datasets":[{"label":"230V","points":[{"rpm":0,"torque":1.2},{"rpm":500,"torque":0.9}]}]}' />
          </Form.Item>
          <Form.Item name="configurationRules" label="配置规则 (JSON)">
            <Input.TextArea rows={5} placeholder='[{"module":"shaft","label":"Shaft Options","options":[{"id":"single","label":"Single Shaft"}]}]' />
          </Form.Item>

          <Form.Item name="brandId" label="品牌">
            <Select allowClear options={brandOptions} />
          </Form.Item>
          <Form.Item name="defaultCategoryId" label="默认分类">
            <Select allowClear options={categoryOptions} />
          </Form.Item>
          <Form.Item name="paidSampleEnabled" label="付邮拿样" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="featured" label="首页推荐" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider>产品图片</Divider>
          <Form.List name="images">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small">
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Form.Item name={[field.name, 'url']} label="图片 URL" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name={[field.name, 'alt']} label="图片描述" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Space style={{ width: '100%' }}>
                        <Form.Item name={[field.name, 'width']} label="宽度" style={{ flex: 1 }}>
                          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'height']} label="高度" style={{ flex: 1 }}>
                          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Space>
                      <Form.Item name={[field.name, 'isPrimary']} label="主图" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        删除图片
                      </Button>
                    </Space>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ url: '', alt: '', width: null, height: null, isPrimary: false })}>
                  新增图片
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>产品特性</Divider>
          <Form.List name="features">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small">
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Form.Item name={[field.name, 'specCategory']} label="规格分类">
                        <Select
                          options={[
                            { value: 'general', label: '通用' },
                            { value: 'electrical', label: '电气' },
                            { value: 'mechanical', label: '机械' },
                            { value: 'performance', label: '性能' },
                            { value: 'environmental', label: '环境' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, 'featureKey']} label="特性名称" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name={[field.name, 'valueType']} label="值类型">
                        <Select
                          options={[
                            { value: 'text', label: '文本' },
                            { value: 'number', label: '数值' },
                            { value: 'range', label: '范围' },
                            { value: 'boolean', label: '是/否' },
                            { value: 'select', label: '选项' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.features?.[field.name]?.valueType !== cur.features?.[field.name]?.valueType}>
                        {({ getFieldValue }) => {
                          const valueType = getFieldValue(['features', field.name, 'valueType']);
                          if (valueType === 'range') {
                            return (
                              <Space style={{ width: '100%' }}>
                                <Form.Item name={[field.name, 'featureValueMin']} label="最小值" style={{ flex: 1 }}>
                                  <InputNumber style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name={[field.name, 'featureValueMax']} label="最大值" style={{ flex: 1 }}>
                                  <InputNumber style={{ width: '100%' }} />
                                </Form.Item>
                              </Space>
                            );
                          }
                          if (valueType === 'number') {
                            return (
                              <Form.Item name={[field.name, 'featureValueMin']} label="数值">
                                <InputNumber style={{ width: '100%' }} />
                              </Form.Item>
                            );
                          }
                          return (
                            <Form.Item name={[field.name, 'featureValue']} label="特性值" rules={[{ required: true }]}>
                              <Input />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                      <Form.Item name={[field.name, 'unit']} label="单位">
                        <Input />
                      </Form.Item>
                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        删除特性
                      </Button>
                    </Space>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ featureKey: '', featureValue: '', featureValueMin: null, featureValueMax: null, valueType: 'text', unit: null, specCategory: 'general' })}>
                  新增特性
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>资料附件</Divider>
          <Form.List name="attachments">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small">
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Form.Item name={[field.name, 'name']} label="附件名称" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name={[field.name, 'url']} label="附件 URL" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name={[field.name, 'mimeType']} label="MIME 类型" rules={[{ required: true }]}>
                        <Input placeholder="application/pdf" />
                      </Form.Item>
                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        删除附件
                      </Button>
                    </Space>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ name: '', url: '', mimeType: 'application/pdf' })}>
                  新增附件
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>兼容产品 (Compatible Products)</Divider>
          <Form.List name="compatibleProducts">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Form.Item name={[field.name, 'relatedProductId']} label="关联产品" rules={[{ required: true, message: '请选择关联产品' }]}>
                        <Select
                          showSearch
                          filterOption={false}
                          onSearch={handleProductSearch}
                          options={productSearchOptions}
                          placeholder="搜索产品名称或 SKU"
                          notFoundContent="输入至少 2 个字符搜索"
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, 'relationType']} label="关联类型" rules={[{ required: true }]}>
                        <Select
                          options={[
                            { value: 'drivers', label: 'Drivers (驱动)' },
                            { value: 'mechanical-integration', label: 'Mechanical Integration (机械集成)' },
                            { value: 'power-control', label: 'Power & Control (电源与控制)' },
                            { value: 'custom', label: 'Custom (自定义)' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.compatibleProducts?.[field.name]?.relationType !== cur.compatibleProducts?.[field.name]?.relationType}>
                        {({ getFieldValue }) => {
                          const relationType = getFieldValue(['compatibleProducts', field.name, 'relationType']);
                          return relationType === 'custom' ? (
                            <Form.Item name={[field.name, 'relationLabel']} label="自定义标签">
                              <Input placeholder="例如：推荐配件" />
                            </Form.Item>
                          ) : null;
                        }}
                      </Form.Item>
                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        删除兼容产品
                      </Button>
                    </Space>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ relatedProductId: '', relationType: 'mechanical-integration', relationLabel: null })}>
                  新增兼容产品
                </Button>
              </Space>
            )}
          </Form.List>

          {editingId ? (
            <>
              <Divider>多语言翻译</Divider>
              <Space style={{ width: '100%', marginBottom: 12 }}>
                <Select
                  value={translationLocale}
                  onChange={(val) => loadTranslation(editingId, val)}
                  options={[
                    { value: 'de', label: 'Deutsch' },
                    { value: 'fr', label: 'Français' },
                    { value: 'es', label: 'Español' },
                  ]}
                  style={{ minWidth: 160 }}
                />
                <Button type="primary" onClick={saveTranslation}>保存翻译</Button>
                <Button onClick={aiTranslateFields}>AI 翻译</Button>
              </Space>
              <Form.Item label="翻译名称">
                <Input value={translationFields.name} onChange={(e) => setTranslationFields((prev) => ({ ...prev, name: e.target.value }))} />
              </Form.Item>
              <Form.Item label="翻译简短描述">
                <Input.TextArea rows={2} value={translationFields.shortDescription} onChange={(e) => setTranslationFields((prev) => ({ ...prev, shortDescription: e.target.value }))} />
              </Form.Item>
              <Form.Item label="翻译详细描述">
                <Input.TextArea rows={4} value={translationFields.description} onChange={(e) => setTranslationFields((prev) => ({ ...prev, description: e.target.value }))} />
              </Form.Item>
              <Form.Item label="翻译 SEO 标题">
                <Input value={translationFields.seoTitle} onChange={(e) => setTranslationFields((prev) => ({ ...prev, seoTitle: e.target.value }))} />
              </Form.Item>
              <Form.Item label="翻译 SEO 描述">
                <Input.TextArea rows={2} value={translationFields.seoDescription} onChange={(e) => setTranslationFields((prev) => ({ ...prev, seoDescription: e.target.value }))} />
              </Form.Item>
            </>
          ) : (
            <Typography.Text type="secondary">创建产品后即可添加多语言翻译</Typography.Text>
          )}

        </Form>
      </Modal>
    </Space>
  );
}
