'use client';

import { Button, Col, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Tabs, message } from 'antd';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { AdminDateTimePicker } from '@/components/admin/admin-datetime-picker';
import { BrandPickerField } from '@/components/brands/brand-picker-field';
import { CategoryPickerField } from '@/components/categories/category-picker-field';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { ProductAttachmentsField } from '@/components/products/product-attachments-field';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { productLifecycleOptions } from '@/lib/admin-display';
import { confirmProductListingChange } from '@/lib/confirm-product-listing';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { getCommonCurrencyGroupedSelectOptions, getDefaultCurrencyForLanguage } from '@/lib/currencies';
import {
  buildSnapshotFromConfig,
  convertProductPrices,
  type ExchangeRateSnapshot,
} from '@/lib/currency-exchange';
import {
  type AdminProductListItem,
  type AdminProductPayload,
  type AdminProductTranslation,
  type ProductPurchaseMode,
  type ProductStatus,
  defaultProductPayload,
  resolveProductId,
} from '@/lib/product-content';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { runDefaultLocaleSaveGate } from '@/lib/admin-default-locale-save';
import { textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'pricing' | 'manufacturing' | 'attachments' | 'seo';

type LocaleFormValues = {
  name: string;
  shortDescription: string;
  description: string;
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
  editingEntry: AdminProductListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminProductTranslation) => void;
};

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function createEmptyDraft(currencyCode = 'USD'): LocaleDraft {
  return {
    name: '',
    shortDescription: '',
    description: '',
    coverUrl: '',
    coverAlt: '',
    gallery: [],
    price: 0,
    compareAtPrice: null,
    currencyCode,
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
    description: entry.description ?? '',
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
      description: hasMeaningfulHtmlBody(values.description ?? '')
        ? values.description
        : previous.description,
      coverUrl: values.coverUrl?.trim() ? values.coverUrl : previous.coverUrl,
      coverAlt: values.coverAlt?.trim() ? values.coverAlt : previous.coverAlt,
      gallery: values.gallery?.length ? values.gallery : previous.gallery,
      attachments: values.attachments?.length ? values.attachments : previous.attachments,
    },
  };
}

function inheritDefaultLocaleMedia(draft: LocaleDraft, defaultDraft: LocaleDraft | undefined): LocaleDraft {
  if (!defaultDraft) return draft;
  return {
    ...draft,
    coverUrl: draft.coverUrl.trim() ? draft.coverUrl : defaultDraft.coverUrl,
    coverAlt: draft.coverAlt.trim() ? draft.coverAlt : defaultDraft.coverAlt,
    gallery: draft.gallery.length ? draft.gallery : defaultDraft.gallery,
    attachments: draft.attachments.length ? draft.attachments : defaultDraft.attachments,
  };
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
  editingEntry,
  onClose,
  onSaved,
}: ProductEditorModalProps) {
  const [productId, setProductId] = useState<string | undefined>();
  const [spu, setSpu] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
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
  const [exchangeSnapshot, setExchangeSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const activeLocaleRef = useRef(activeLocale);

  useEffect(() => {
    activeLocaleRef.current = activeLocale;
  }, [activeLocale]);

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);
  const defaultCategoryId = categoryIds[0] ?? null;

  function resolveCurrencyForLocale(locale: string) {
    const language = activeLanguages.find((item) => item.code === locale);
    return language?.currencyCode ?? getDefaultCurrencyForLanguage(locale);
  }

  function makeEmptyDraft(locale: string) {
    return createEmptyDraft(resolveCurrencyForLocale(locale));
  }

  useEffect(() => {
    if (!open) return;
    void fetch('/api/admin/exchange-rates')
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (config) {
          setExchangeSnapshot(buildSnapshotFromConfig(config));
        }
      })
      .catch(() => setExchangeSnapshot(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!activeLanguages.length) {
      setProductId(undefined);
      setActiveLocale('');
      setDrafts({});
      form.resetFields();
      return;
    }

    const nextDefaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
    setActiveLocale(nextDefaultLocale);
    setSectionTab('content');

    if (!editingEntry) {
      setProductId(undefined);
      setSpu('');
      setBrandId(null);
      setCategoryIds([]);
      setFeatured(false);
      setFeaturedSortOrder(0);
      setPurchaseMode('buy');
      setPaidSampleEnabled(false);
      setStatus('inactive');
      const emptyDrafts = Object.fromEntries(
        activeLanguages.map((language) => [language.code, makeEmptyDraft(language.code)]),
      );
      setDrafts(emptyDrafts);
      form.setFieldsValue(makeEmptyDraft(nextDefaultLocale));
      setEditorRevision((value) => value + 1);
      return;
    }

    setProductId(editingEntry.id);
    setSpu(editingEntry.spu);
    setBrandId(editingEntry.brandId);
    setCategoryIds(
      editingEntry.categoryIds?.length
        ? editingEntry.categoryIds
        : editingEntry.defaultCategoryId
          ? [editingEntry.defaultCategoryId]
          : [],
    );
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

        setCategoryIds(
          payload.item.categoryIds?.length
            ? payload.item.categoryIds
            : payload.item.defaultCategoryId
              ? [payload.item.defaultCategoryId]
              : [],
        );
        setBrandId(payload.item.brandId);

        const nextDrafts = Object.fromEntries(
          activeLanguages.map((language) => {
            const translation = payload.translations.find((item) => item.locale === language.code);
            return [language.code, translation ? entryToDraft(translation) : makeEmptyDraft(language.code)];
          }),
        );
        setDrafts(nextDrafts);
        loadDraft(activeLocaleRef.current, nextDrafts);
        setEditorRevision((value) => value + 1);
      } catch {
        void messageApi.error('加载产品详情失败');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, form, messageApi]);

  function loadDraft(locale: string, source: Record<string, LocaleDraft>) {
    let draft = source[locale] ?? makeEmptyDraft(locale);
    if (!draft.persisted && !draft.name.trim()) {
      draft = { ...draft, currencyCode: resolveCurrencyForLocale(locale) };
    }
    form.setFieldsValue(draft);
    setEditorRevision((value) => value + 1);
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    loadDraft(nextLocale, merged);
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale, form);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? createEmptyDraft();
    return {
      name: draft.name,
      shortDescription: draft.shortDescription,
      description: draft.description,
      coverAlt: draft.coverAlt,
      certificationsText: draft.certificationsText,
      tagsText: draft.tagsText,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? createEmptyDraft();
    return Boolean(
      draft.name.trim()
      || draft.shortDescription.trim()
      || hasMeaningfulHtmlBody(draft.description)
      || draft.coverAlt.trim()
      || draft.certificationsText.trim()
      || draft.tagsText.trim()
      || draft.seoTitle.trim()
      || draft.seoDescription.trim(),
    );
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? makeEmptyDraft(activeLocale);
    const nextDraft = applyNonemptyTranslatedFields(current, fields);
    const defaultDraft = merged[defaultLocale] ?? makeEmptyDraft(defaultLocale);
    const targetCurrency = resolveCurrencyForLocale(activeLocale);

    if (exchangeSnapshot) {
      const converted = convertProductPrices({
        price: defaultDraft.price,
        compareAtPrice: defaultDraft.compareAtPrice,
        fromCurrency: defaultDraft.currencyCode,
        toCurrency: targetCurrency,
        snapshot: exchangeSnapshot,
      });
      if (converted.missingRate) {
        void messageApi.warning(`未配置 ${converted.missingRate} 汇率，价格未换算`);
      } else {
        if (converted.price != null) nextDraft.price = converted.price;
        if (converted.compareAtPrice != null) nextDraft.compareAtPrice = converted.compareAtPrice;
        nextDraft.currencyCode = converted.currencyCode;
      }
    }

    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue({
      name: nextDraft.name,
      shortDescription: nextDraft.shortDescription,
      description: nextDraft.description,
      slug: nextDraft.slug,
      coverAlt: nextDraft.coverAlt,
      certificationsText: nextDraft.certificationsText,
      tagsText: nextDraft.tagsText,
      seoTitle: nextDraft.seoTitle,
      seoDescription: nextDraft.seoDescription,
      price: nextDraft.price,
      compareAtPrice: nextDraft.compareAtPrice,
      currencyCode: nextDraft.currencyCode,
    });
    setEditorRevision((value) => value + 1);
  }

  function validateDraft(locale: string, draft: LocaleDraft) {
    if (!spu.trim()) return { ok: false as const, locale, message: '请填写 SPU', section: 'content' as const };
    if (!categoryIds.length) return { ok: false as const, locale, message: '请选择至少一个分类', section: 'content' as const };
    if (!brandId) return { ok: false as const, locale, message: '请选择品牌', section: 'content' as const };
    if (draft.leadTimeMin > draft.leadTimeMax) {
      return { ok: false as const, locale, message: '最短交期不能大于最长交期', section: 'content' as const };
    }
    return validateSourceThenAutoSlug({
      locale,
      sourceText: draft.name,
      slug: draft.slug,
      emptySourceMessage: '请填写产品名称',
      section: 'content',
    });
  }

  function buildTranslationPayload(draft: LocaleDraft, locale: string) {
    return {
      productId,
      locale,
      spu: spu.trim(),
      brandId,
      defaultCategoryId,
      categoryIds,
      purchaseMode,
      paidSampleEnabled,
      featured,
      featuredSortOrder,
      status,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      shortDescription: draft.shortDescription.trim() || null,
      description: draft.description.trim() || null,
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
    const gate = runDefaultLocaleSaveGate({
      defaultLocale,
      mergedDrafts,
      createEmptyDraft,
      validateDraft,
    });
    if (!gate.ok) {
      setDrafts(mergedDrafts);
      setActiveLocale(gate.validation.locale || defaultLocale);
      setSectionTab(
        gate.validation.message === '最短交期不能大于最长交期'
          ? 'manufacturing'
          : gate.validation.section === 'seo'
            ? 'seo'
            : 'content',
      );
      loadDraft(gate.validation.locale || defaultLocale, mergedDrafts);
      void messageApi.error(gate.validation.message);
      return;
    }
    const workingDrafts = gate.mergedDrafts;
    if (workingDrafts[defaultLocale]?.slug) {
      form.setFieldValue('slug', workingDrafts[defaultLocale].slug);
    }

    const defaultDraft = workingDrafts[defaultLocale];
    const targets = activeLanguages
      .map((language) => {
        const draft = workingDrafts[language.code] ?? createEmptyDraft();
        return {
          locale: language.code,
          draft: inheritDefaultLocaleMedia(draft, defaultDraft),
        };
      })
      .filter((target) => shouldPersistLocaleDraft({
        locale: target.locale,
        defaultLocale,
        primaryText: target.draft.name,
      }));

    if (!targets.length) {
      void messageApi.warning('请至少填写一个语言版本的内容');
      return;
    }

    for (const target of targets) {
      const validation = validateDraft(target.locale, target.draft);
      if (!validation.ok) {
        setDrafts(workingDrafts);
        setActiveLocale(validation.locale);
        setSectionTab(
          validation.message === '最短交期不能大于最长交期'
            ? 'manufacturing'
            : validation.section === 'seo'
              ? 'seo'
              : 'content',
        );
        loadDraft(validation.locale, workingDrafts);
        const language = activeLanguages.find((item) => item.code === validation.locale);
        void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
        return;
      }
      if (validation.autoSlug) {
        target.draft.slug = validation.autoSlug;
        workingDrafts[target.locale] = { ...workingDrafts[target.locale], slug: validation.autoSlug };
      }
    }

    setDrafts(workingDrafts);
    if (workingDrafts[activeLocale]?.slug) {
      form.setFieldValue('slug', workingDrafts[activeLocale].slug);
    }

    startTransition(async () => {
      let nextProductId = productId;
      const nextDrafts = { ...workingDrafts };
      const savedEntries: AdminProductTranslation[] = [];
      const shared = {
        spu: spu.trim(),
        brandId,
        defaultCategoryId,
        categoryIds,
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
      void messageApi.success('保存成功');
      onClose();
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
          <Form.Item label="所属分类" layout="vertical" required style={{ marginBottom: 16 }}>
            <CategoryPickerField
              mode="multiple"
              categoryTree={categoryTree}
              value={categoryIds}
              onChange={setCategoryIds}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="所属品牌" layout="vertical" required style={{ marginBottom: 16 }}>
            <BrandPickerField
              mode="single"
              value={brandId ?? ''}
              onChange={(value) => setBrandId(value || null)}
              addButtonLabel="选择品牌"
            />
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
                    tabBarExtraContent={(
                      <ContentTranslateButton
                        contentType="product"
                        defaultLocale={defaultLocale}
                        activeLocale={activeLocale}
                        disabled={loadingGroup}
                        getDefaultSourceFields={getDefaultSourceFields}
                        hasDefaultPersisted={() => Boolean(getMergedDrafts()[defaultLocale]?.persisted)}
                        hasTargetContent={hasTargetLocaleContent}
                        onTranslated={handleTranslated}
                      />
                    )}
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
                                  form.setFieldValue('slug', textToSlug(name));
                                }
                              }} />
                            </Form.Item>
                            <Form.Item label="简短描述" name="shortDescription"><Input.TextArea rows={3} /></Form.Item>
                            <Form.Item label="详细描述" name="description">
                              <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
                            </Form.Item>
                            <Form.Item
                              label="封面图"
                              name="coverUrl"
                              getValueFromEvent={(value: string | null) => value ?? ''}
                            >
                              <CoverImageField folder="products/covers" />
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
                                        <AdminDateTimePicker mode="date" />
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
                                        <AdminDateTimePicker mode="date" />
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
                            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请填写 Slug' }]} extra="留空将根据产品名称自动生成；同一语言下的产品 slug 不可重复"><Input /></Form.Item>
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
