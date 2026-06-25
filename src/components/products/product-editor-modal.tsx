'use client';

import { Button, Col, DatePicker, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Tabs, TreeSelect, message } from 'antd';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { ProductAttachmentsField } from '@/components/products/product-attachments-field';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { productLifecycleOptions } from '@/lib/admin-display';
import { buildCategoryParentTreeSelectData } from '@/lib/category-parent-tree-select';
import { confirmProductListingChange } from '@/lib/confirm-product-listing';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { getCommonCurrencyGroupedSelectOptions } from '@/lib/currencies';
import {
  type AdminProductListItem,
  type AdminProductPayload,
  type AdminProductTranslation,
  type ProductPurchaseMode,
  type ProductStatus,
  defaultProductPayload,
  resolveProductId,
} from '@/lib/product-content';
import { generateSlugFromText } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'pricing' | 'manufacturing' | 'attachments' | 'seo';

type LocaleFormValues = {
  name: string;
  shortDescription: string;
  descriptionLong: string;
  coverUrl: string;
  coverAlt: string;
  gallery: AdminProductPayload['gallery'];
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  stockQuantity: number;
  moq: number;
  lifecycleStatus: string;
  eolDate: Dayjs | null;
  lastTimeBuyDate: Dayjs | null;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  efficiencyClass: string;
  certificationsText: string;
  attachments: AdminProductPayload['attachments'];
  slug: string;
  tagsText: string;
  seoTitle: string;
  seoDescription: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type ProductEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  categoryTree: AdminCategoryTreeNode[];
  brandOptions: Array<{ label: string; value: string }>;
  editingEntry: AdminProductListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminProductTranslation) => void;
};

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function createEmptyDraft(): LocaleDraft {
  return {
    name: '',
    shortDescription: '',
    descriptionLong: '',
    coverUrl: '',
    coverAlt: '',
    gallery: [],
    price: 0,
    compareAtPrice: null,
    currencyCode: 'USD',
    stockQuantity: 0,
    moq: 1,
    lifecycleStatus: 'active',
    eolDate: null,
    lastTimeBuyDate: null,
    leadTimeMin: 3,
    leadTimeMax: 15,
    leadTimeUnit: 'business_days',
    efficiencyClass: '',
    certificationsText: '',
    attachments: [],
    slug: '',
    tagsText: '',
    seoTitle: '',
    seoDescription: '',
    persisted: false,
  };
}

function entryToDraft(entry: AdminProductTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    name: entry.name,
    shortDescription: entry.shortDescription ?? '',
    descriptionLong: entry.descriptionLong ?? '',
    coverUrl: entry.payload.coverUrl ?? '',
    coverAlt: entry.payload.coverAlt ?? '',
    gallery: entry.payload.gallery ?? [],
    price: Number(entry.price) || 0,
    compareAtPrice: entry.compareAtPrice == null ? null : Number(entry.compareAtPrice),
    currencyCode: entry.currencyCode,
    stockQuantity: entry.stockQuantity,
    moq: entry.moq,
    lifecycleStatus: entry.lifecycleStatus,
    eolDate: entry.eolDate ? dayjs(entry.eolDate) : null,
    lastTimeBuyDate: entry.lastTimeBuyDate ? dayjs(entry.lastTimeBuyDate) : null,
    leadTimeMin: entry.leadTimeMin,
    leadTimeMax: entry.leadTimeMax,
    leadTimeUnit: entry.leadTimeUnit,
    efficiencyClass: entry.efficiencyClass ?? '',
    certificationsText: (entry.payload.certifications ?? []).join('\n'),
    attachments: entry.payload.attachments ?? [],
    slug: entry.slug,
    tagsText: (entry.payload.tags ?? []).join('\n'),
    seoTitle: entry.seoTitle ?? '',
    seoDescription: entry.seoDescription ?? '',
    persisted: true,
  };
}

function mergeActiveFormIntoDrafts(
  drafts: Record<string, LocaleDraft>,
  activeLocale: string,
  form: FormInstance<LocaleFormValues>,
): Record<string, LocaleDraft> {
  if (!activeLocale) return drafts;
  const previous = drafts[activeLocale] ?? createEmptyDraft();
  const values = form.getFieldsValue(true);
  return {
    ...drafts,
    [activeLocale]: {
      ...previous,
      ...values,
      gallery: values.gallery ?? [],
      attachments: values.attachments ?? [],
    },
  };
}

function shouldPersistDraft(draft: LocaleDraft) {
  if (draft.persisted) return true;
  return Boolean(
    draft.name.trim()
    || draft.shortDescription.trim()
    || draft.descriptionLong.trim()
    || draft.coverUrl.trim()
    || draft.gallery.length
    || draft.slug.trim(),
  );
}

function buildPayload(draft: LocaleDraft): AdminProductPayload {
  return {
    coverUrl: draft.coverUrl.trim() || null,
    coverAlt: draft.coverAlt.trim() || null,
    gallery: draft.gallery ?? [],
    tags: splitMultiline(draft.tagsText),
    attachments: draft.attachments ?? [],
    certifications: splitMultiline(draft.certificationsText),
  };
}

export function ProductEditorModal({
  open,
  activeLanguages,
  categoryTree,
  brandOptions,
  editingEntry,
  onClose,
  onSaved,
}: ProductEditorModalProps) {
  const [productId, setProductId] = useState<string | undefined>();
  const [spu, setSpu] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const [featuredSortOrder, setFeaturedSortOrder] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<ProductPurchaseMode>('buy');
  const [paidSampleEnabled, setPaidSampleEnabled] = useState(false);
  const [status, setStatus] = useState<ProductStatus>('inactive');
  const [activeLocale, setActiveLocale] = useState('');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();

  const hasLanguages = activeLanguages.length > 0;
  const isEditing = Boolean(editingEntry);
  const categoryTreeData = useMemo(
    () => buildCategoryParentTreeSelectData(categoryTree, new Set()),
    [categoryTree],
  );
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);

  useEffect(() => {
    if (!open) return;

    if (!activeLanguages.length) {
      setProductId(undefined);
      setActiveLocale('');
      setDrafts({});
      form.resetFields();
      return;
    }

    const defaultLocale = activeLanguages[0]?.code ?? '';
    setActiveLocale(defaultLocale);
    setSectionTab('content');

    if (!editingEntry) {
      setProductId(undefined);
      setSpu('');
      setBrandId(null);
      setDefaultCategoryId(null);
      setFeatured(false);
      setFeaturedSortOrder(0);
      setPurchaseMode('buy');
      setPaidSampleEnabled(false);
      setStatus('inactive');
      const emptyDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));
      setDrafts(emptyDrafts);
      form.setFieldsValue(createEmptyDraft());
      setEditorRevision((value) => value + 1);
      return;
    }

    setProductId(editingEntry.id);
    setSpu(editingEntry.spu);
    setBrandId(editingEntry.brandId);
    setDefaultCategoryId(editingEntry.defaultCategoryId);
    setFeatured(editingEntry.featured);
    setPaidSampleEnabled(editingEntry.paidSampleEnabled);
    setPurchaseMode(editingEntry.purchaseMode);
    setStatus(editingEntry.status);
    setLoadingGroup(true);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/products/${editingEntry.id}`);
        if (!response.ok) throw new Error('load failed');
        const payload = (await response.json()) as {
          item: AdminProductListItem;
          translations: AdminProductTranslation[];
        };

        const firstTranslation = payload.translations[0];
        if (firstTranslation) {
          setFeaturedSortOrder(firstTranslation.featuredSortOrder);
        }

        const nextDrafts = Object.fromEntries(
          activeLanguages.map((language) => {
            const translation = payload.translations.find((item) => item.locale === language.code);
            return [language.code, translation ? entryToDraft(translation) : createEmptyDraft()];
          }),
        );
        setDrafts(nextDrafts);
        form.setFieldsValue(nextDrafts[defaultLocale] ?? createEmptyDraft());
        setEditorRevision((value) => value + 1);
      } catch {
        void messageApi.error('加载产品详情失败');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, form, messageApi]);

  function loadDraft(locale: string, source: Record<string, LocaleDraft>) {
    const draft = source[locale] ?? createEmptyDraft();
    form.setFieldsValue(draft);
    setEditorRevision((value) => value + 1);
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    loadDraft(nextLocale, merged);
  }

  function validateDraft(locale: string, draft: LocaleDraft) {
    if (!spu.trim()) return { ok: false as const, locale, message: '请填写 SPU' };
    if (!draft.name.trim()) return { ok: false as const, locale, message: '请填写产品名称' };
    if (!draft.slug.trim()) return { ok: false as const, locale, message: '请填写 Slug' };
    if (draft.leadTimeMin > draft.leadTimeMax) {
      return { ok: false as const, locale, message: '最短交期不能大于最长交期' };
    }
    return { ok: true as const };
  }

  function buildTranslationPayload(draft: LocaleDraft, locale: string) {
    return {
      productId,
      locale,
      spu: spu.trim(),
      brandId,
      defaultCategoryId,
      purchaseMode,
      paidSampleEnabled,
      featured,
      featuredSortOrder,
      status,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      shortDescription: draft.shortDescription.trim() || null,
      description: null,
      descriptionLong: draft.descriptionLong.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      price: draft.price,
      compareAtPrice: draft.compareAtPrice,
      currencyCode: draft.currencyCode,
      stockQuantity: draft.stockQuantity,
      moq: draft.moq,
      leadTimeMin: draft.leadTimeMin,
      leadTimeMax: draft.leadTimeMax,
      leadTimeUnit: draft.leadTimeUnit,
      lifecycleStatus: draft.lifecycleStatus,
      eolDate: draft.eolDate ? draft.eolDate.toISOString() : null,
      lastTimeBuyDate: draft.lastTimeBuyDate ? draft.lastTimeBuyDate.toISOString() : null,
      efficiencyClass: draft.efficiencyClass.trim() || null,
      payload: buildPayload(draft),
    };
  }

  function persistAllLocales() {
    if (!hasLanguages) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
      return;
    }

    const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    const targets = activeLanguages
      .map((language) => ({ locale: language.code, draft: mergedDrafts[language.code] ?? createEmptyDraft() }))
      .filter((target) => shouldPersistDraft(target.draft));

    if (!targets.length) {
      void messageApi.warning('请至少填写一个语言版本的内容');
      return;
    }

    for (const target of targets) {
      const validation = validateDraft(target.locale, target.draft);
      if (!validation.ok) {
        setDrafts(mergedDrafts);
        setActiveLocale(validation.locale);
        loadDraft(validation.locale, mergedDrafts);
        const language = activeLanguages.find((item) => item.code === validation.locale);
        void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
        return;
      }
    }

    setDrafts(mergedDrafts);

    startTransition(async () => {
      let nextProductId = productId;
      const nextDrafts = { ...mergedDrafts };
      const savedEntries: AdminProductTranslation[] = [];
      const shared = {
        spu: spu.trim(),
        brandId,
        defaultCategoryId,
        featured,
        featuredSortOrder,
        purchaseMode,
        paidSampleEnabled,
        status,
      };

      if (nextProductId) {
        const patchResponse = await fetch(`/api/admin/products/${nextProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          const payload = await patchResponse.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? '产品基础信息保存失败');
          return;
        }
      }

      for (const { locale, draft } of targets) {
        const response = await fetch(
          draft.entryId
            ? `/api/admin/products/translations/${draft.entryId}`
            : '/api/admin/products',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationPayload(draft, locale)),
          },
        );

        if (!response.ok) {
          const language = activeLanguages.find((item) => item.code === locale);
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? `${language?.nativeName ?? locale} 保存失败`);
          if (savedEntries.length > 0) {
            for (const saved of savedEntries) onSaved(saved);
          }
          return;
        }

        const saved = (await response.json()) as AdminProductTranslation;
        nextProductId = resolveProductId(saved);
        nextDrafts[locale] = { ...draft, entryId: saved.id, persisted: true };
        savedEntries.push(saved);
      }

      setDrafts(nextDrafts);
      setProductId(nextProductId);
      loadDraft(activeLocale, nextDrafts);
      for (const saved of savedEntries) onSaved(saved);
      void messageApi.success(`已保存 ${savedEntries.length} 个语言版本`);
    });
  }

  const sharedFieldsPanel = (
    <div className="content-editor-shared-section">
      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="SPU" layout="vertical" required style={{ marginBottom: 16 }}>
            <Input value={spu} onChange={(event) => setSpu(event.target.value)} placeholder="全局唯一 SPU" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="所属分类" layout="vertical" style={{ marginBottom: 16 }}>
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              treeNodeFilterProp="title"
              placeholder="选择分类"
              value={defaultCategoryId ?? undefined}
              onChange={(value) => setDefaultCategoryId(value ?? null)}
              treeData={categoryTreeData}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="所属品牌" layout="vertical" style={{ marginBottom: 16 }}>
            <Select allowClear value={brandId ?? undefined} onChange={(value) => setBrandId(value ?? null)} options={brandOptions} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="推荐到首页" layout="vertical" style={{ marginBottom: 16 }}>
            <Switch checked={featured} onChange={setFeatured} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="首页展示顺序" layout="vertical" style={{ marginBottom: 16 }}>
            <InputNumber min={0} style={{ width: '100%' }} disabled={!featured} value={featuredSortOrder} onChange={(value) => setFeaturedSortOrder(Number(value ?? 0))} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="购买模式" layout="vertical" style={{ marginBottom: 16 }}>
            <Select
              value={purchaseMode}
              onChange={setPurchaseMode}
              options={[
                { value: 'buy', label: '直接下单' },
                { value: 'inquiry', label: '询价模式' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="付邮拿样" layout="vertical" style={{ marginBottom: 16 }}>
            <Switch checked={paidSampleEnabled} onChange={setPaidSampleEnabled} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="上架状态" layout="vertical" style={{ marginBottom: 16 }}>
            <Switch
              checked={status === 'active'}
              checkedChildren="上架"
              unCheckedChildren="下架"
              onChange={(checked) => {
                const nextStatus: ProductStatus = checked ? 'active' : 'inactive';
                if (nextStatus === status) {
                  return;
                }
                confirmProductListingChange(nextStatus, () => setStatus(nextStatus));
              }}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  return (
    <>
      {contextHolder}
      <Modal
        title={isEditing ? `编辑产品 · ${editingEntry?.name ?? ''}` : '新建产品'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1180}
        destroyOnHidden
        confirmLoading={isPending || loadingGroup}
        className="content-editor-modal product-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
      >
        {!hasLanguages ? (
          <Empty description="尚未配置站点语言，请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages"><Button type="primary">前往多语言管理</Button></Link>
          </Empty>
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" loading={isPending} onClick={() => persistAllLocales()}>
                {isEditing ? '保存' : '保存产品'}
              </Button>
            </div>
            {sharedFieldsPanel}
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((language) => (
                  <ContentEditorLocaleTab
                    key={language.code}
                    language={language}
                    isActive={language.code === activeLocale}
                    persisted={drafts[language.code]?.persisted}
                    onClick={() => handleLocaleChange(language.code)}
                  />
                ))}
              </div>
              <div className="content-editor-main">
                <Form<LocaleFormValues> form={form} layout="vertical" preserve>
                  <Tabs
                    activeKey={sectionTab}
                    onChange={(key) => setSectionTab(key as SectionTabKey)}
                    items={[
                      {
                        key: 'content',
                        label: '内容',
                        children: (
                          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Form.Item label="产品名称" name="name" rules={[{ required: true, message: '请填写产品名称' }]}>
                              <Input placeholder="产品名称" onBlur={() => {
                                const name = form.getFieldValue('name');
                                const slug = form.getFieldValue('slug');
                                if (!slug?.trim() && name?.trim()) {
                                  form.setFieldValue('slug', generateSlugFromText(name));
                                }
                              }} />
                            </Form.Item>
                            <Form.Item label="简短描述" name="shortDescription"><Input.TextArea rows={3} /></Form.Item>
                            <Form.Item label="详细描述" name="descriptionLong">
                              <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
                            </Form.Item>
                            <Form.Item label="封面图" name="coverUrl">
                              <CoverImageField folder="products/covers" value={form.getFieldValue('coverUrl') || null} onChange={(value) => form.setFieldValue('coverUrl', value ?? '')} />
                            </Form.Item>
                            <Form.Item label="封面图 Alt" name="coverAlt"><Input /></Form.Item>
                            <Form.Item label="轮播图" name="gallery"><ProductGalleryField /></Form.Item>
                          </Space>
                        ),
                      },
                      {
                        key: 'pricing',
                        label: '价格与库存',
                        children: (
                          <Row gutter={16}>
                            <Col xs={24} md={8}><Form.Item label="销售价" name="price"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="原价" name="compareAtPrice"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="币种" name="currencyCode"><Select options={currencyOptions} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="默认库存" name="stockQuantity"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="最小起订量 (MOQ)" name="moq"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="生命周期" name="lifecycleStatus"><Select options={productLifecycleOptions} /></Form.Item></Col>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.lifecycleStatus !== cur.lifecycleStatus}>
                              {({ getFieldValue }) => {
                                const status = getFieldValue('lifecycleStatus');
                                if (status === 'eol' || status === 'last_time_buy') {
                                  return (
                                    <Col xs={24} md={8}>
                                      <Form.Item label="EOL 日期" name="eolDate">
                                        <DatePicker style={{ width: '100%' }} />
                                      </Form.Item>
                                    </Col>
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
                                    <Col xs={24} md={8}>
                                      <Form.Item label="最后采购日期" name="lastTimeBuyDate">
                                        <DatePicker style={{ width: '100%' }} />
                                      </Form.Item>
                                    </Col>
                                  );
                                }
                                return null;
                              }}
                            </Form.Item>
                          </Row>
                        ),
                      },
                      {
                        key: 'manufacturing',
                        label: '制造业',
                        children: (
                          <Row gutter={16}>
                            <Col xs={24} md={8}><Form.Item label="最短交期" name="leadTimeMin"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="最长交期" name="leadTimeMax"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="交期单位" name="leadTimeUnit"><Select options={[{ value: 'business_days', label: '工作日' }, { value: 'calendar_days', label: '自然日' }, { value: 'weeks', label: '周' }]} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="能效等级" name="efficiencyClass"><Input /></Form.Item></Col>
                            <Col xs={24} md={16}><Form.Item label="认证" name="certificationsText" extra="每行一项"><Input.TextArea rows={4} /></Form.Item></Col>
                          </Row>
                        ),
                      },
                      {
                        key: 'attachments',
                        label: '资料附件',
                        children: <Form.Item name="attachments"><ProductAttachmentsField /></Form.Item>,
                      },
                      {
                        key: 'seo',
                        label: 'SEO',
                        children: (
                          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请填写 Slug' }]}><Input /></Form.Item>
                            <Form.Item label="标签" name="tagsText" extra="每行一个标签"><Input.TextArea rows={3} /></Form.Item>
                            <Form.Item label="SEO 标题" name="seoTitle"><Input /></Form.Item>
                            <Form.Item label="SEO 描述" name="seoDescription"><Input.TextArea rows={3} /></Form.Item>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Form>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
