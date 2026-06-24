'use client';

import { Button, Col, Empty, Form, Input, Modal, Row, Space, Switch, Tabs, Tag, message } from 'antd';
import type { FormInstance } from 'antd';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  type AdminBrandListItem,
  type AdminBrandTranslation,
  type BrandStatus,
  resolveBrandId,
} from '@/lib/brand-content';
import { validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'seo';

type LocaleFormValues = {
  name: string;
  description: string;
  slug: string;
  tagsText: string;
  seoTitle: string;
  seoDescription: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type BrandEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  editingEntry: AdminBrandListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminBrandTranslation) => void;
};

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function createEmptyDraft(): LocaleDraft {
  return {
    name: '',
    description: '',
    slug: '',
    tagsText: '',
    seoTitle: '',
    seoDescription: '',
    persisted: false,
  };
}

function entryToDraft(entry: AdminBrandTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    name: entry.name,
    description: entry.description ?? '',
    slug: entry.slug,
    tagsText: entry.payload.tags.join('\n'),
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
    },
  };
}

function shouldPersistDraft(draft: LocaleDraft) {
  if (draft.persisted) return true;
  return Boolean(draft.name.trim() || draft.slug.trim() || draft.description.trim());
}

function validateDraft(locale: string, draft: LocaleDraft) {
  return validateSourceThenAutoSlug({
    locale,
    sourceText: draft.name,
    slug: draft.slug,
    emptySourceMessage: '请输入品牌名称',
  });
}

function buildTranslationPayload(
  draft: LocaleDraft,
  locale: string,
  options: {
    brandId: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    status: BrandStatus;
  },
) {
  return {
    brandId: options.brandId ? options.brandId : undefined,
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    description: draft.description.trim() || null,
    locale,
    seoTitle: draft.seoTitle.trim() || null,
    seoDescription: draft.seoDescription.trim() || null,
    logoUrl: options.logoUrl,
    websiteUrl: options.websiteUrl,
    status: options.status,
    payload: {
      tags: splitMultiline(draft.tagsText),
    },
  };
}

function localeTabLabel(language: AdminSiteLanguageRow, draft?: LocaleDraft) {
  const base = language.nativeName;
  if (draft?.persisted) return `${base} ✓`;
  return base;
}

export function BrandEditorModal({
  open,
  activeLanguages,
  editingEntry,
  onClose,
  onSaved,
}: BrandEditorModalProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const [isPending, startTransition] = useTransition();
  const [brandId, setBrandId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [activeLocale, setActiveLocale] = useState('');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [status, setStatus] = useState<BrandStatus>('active');

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const modalTitle = (
    <Space wrap>
      <span>{isEditing ? `编辑品牌 · ${editingEntry?.name ?? ''}` : '新建品牌'}</span>
      {status === 'active' ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>}
    </Space>
  );

  function loadDraft(locale: string, nextDrafts: Record<string, LocaleDraft>) {
    const draft = nextDrafts[locale] ?? createEmptyDraft();
    form.setFieldsValue({
      name: draft.name,
      description: draft.description,
      slug: draft.slug,
      tagsText: draft.tagsText,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
    });
  }

  useEffect(() => {
    if (!open) return;

    const initialBrandId = editingEntry?.id ?? '';
    setBrandId(initialBrandId);
    setLogoUrl(editingEntry?.logoUrl ?? null);
    setWebsiteUrl(editingEntry?.websiteUrl ?? '');
    setStatus(editingEntry?.status ?? 'active');
    setSectionTab('content');

    const seedDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));
    const nextLocale = editingEntry?.primaryLocale ?? defaultLocale;

    if (editingEntry) {
      seedDrafts[editingEntry.primaryLocale] = {
        ...createEmptyDraft(),
        name: editingEntry.name,
        slug: editingEntry.slug,
        description: editingEntry.description ?? '',
        persisted: true,
      };
    }

    if (!hasLanguages) {
      setDrafts({});
      setActiveLocale('');
      form.resetFields();
      return;
    }

    setLoadingGroup(Boolean(editingEntry));
    setActiveLocale(nextLocale);
    setDrafts(seedDrafts);
    loadDraft(nextLocale, seedDrafts);

    if (!editingEntry) {
      setLoadingGroup(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/admin/brands/${initialBrandId}`);
        const payload = response.ok
          ? (await response.json()) as { item: AdminBrandListItem; translations: AdminBrandTranslation[] }
          : { item: null, translations: [] as AdminBrandTranslation[] };

        if (payload.item) {
          setLogoUrl(payload.item.logoUrl);
          setWebsiteUrl(payload.item.websiteUrl ?? '');
          setStatus(payload.item.status);
        }

        const mergedDrafts = { ...seedDrafts };
        for (const item of payload.translations) {
          mergedDrafts[item.locale] = entryToDraft(item);
        }

        setDrafts(mergedDrafts);
        loadDraft(nextLocale, mergedDrafts);
      } catch {
        void messageApi.warning('加载多语言版本失败，已回退到当前条目');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, defaultLocale, form, hasLanguages, messageApi]);

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    loadDraft(nextLocale, merged);
    setActiveLocale(nextLocale);
  }

  function handleSectionChange(nextTab: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setSectionTab(nextTab as SectionTabKey);
    loadDraft(activeLocale, merged);
  }

  function persistAllLocales(closeAfterSave = false) {
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
        setSectionTab(validation.section);
        loadDraft(validation.locale, mergedDrafts);
        const language = activeLanguages.find((item) => item.code === validation.locale);
        void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
        return;
      }
      if (validation.autoSlug) {
        target.draft.slug = validation.autoSlug;
        mergedDrafts[target.locale] = { ...mergedDrafts[target.locale], slug: validation.autoSlug };
      }
    }

    setDrafts(mergedDrafts);
    if (mergedDrafts[activeLocale]?.slug) {
      form.setFieldValue('slug', mergedDrafts[activeLocale].slug);
    }

    startTransition(async () => {
      let nextBrandId = brandId;
      const nextDrafts = { ...mergedDrafts };
      const savedEntries: AdminBrandTranslation[] = [];
      const shared = {
        logoUrl,
        websiteUrl: websiteUrl.trim() || null,
        status,
      };

      if (nextBrandId) {
        const patchResponse = await fetch(`/api/admin/brands/${nextBrandId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          void messageApi.error('品牌基础信息保存失败');
          return;
        }
      }

      for (const { locale, draft } of targets) {
        const response = await fetch(
          draft.entryId
            ? `/api/admin/brands/translations/${draft.entryId}`
            : '/api/admin/brands',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationPayload(draft, locale, {
              brandId: nextBrandId,
              ...shared,
            })),
          },
        );

        if (!response.ok) {
          const language = activeLanguages.find((item) => item.code === locale);
          const conflict = response.status === 409;
          void messageApi.error(conflict
            ? `${language?.nativeName ?? locale} 保存失败：该语言下 slug 已被占用`
            : `${language?.nativeName ?? locale} 保存失败，请稍后重试`);
          if (savedEntries.length > 0) {
            for (const saved of savedEntries) onSaved(saved);
          }
          return;
        }

        const saved = (await response.json()) as AdminBrandTranslation;
        nextBrandId = resolveBrandId(saved);
        nextDrafts[locale] = {
          ...draft,
          entryId: saved.id,
          persisted: true,
        };
        savedEntries.push(saved);
      }

      setDrafts(nextDrafts);
      setBrandId(nextBrandId);
      loadDraft(activeLocale, nextDrafts);
      for (const saved of savedEntries) onSaved(saved);
      void messageApi.success(`已保存 ${savedEntries.length} 个语言版本`);
      if (closeAfterSave) onClose();
    });
  }

  const editorPanel = (
    <Space orientation="vertical" size="middle" style={{ width: '100%', minWidth: 0 }}>
      <Form<LocaleFormValues> form={form} layout="vertical" preserve>
        <Tabs
          activeKey={sectionTab}
          onChange={handleSectionChange}
          destroyOnHidden
          items={[
            {
              key: 'content',
              label: '内容',
              children: (
                <Row gutter={[16, 0]}>
                  <Col span={24}>
                    <Form.Item label="品牌名称" name="name" rules={[{ required: true, message: '请输入品牌名称' }]}>
                      <Input placeholder="请输入品牌名称" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="品牌描述" name="description">
                      <Input.TextArea rows={4} placeholder="请输入品牌描述" />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'seo',
              label: 'SEO',
              children: (
                <Row gutter={[16, 0]}>
                  <Col span={24}>
                    <Form.Item
                      label="Slug"
                      name="slug"
                      extra="留空将根据品牌名称自动生成；同一语言下的品牌 slug 不可重复"
                    >
                      <Input placeholder="brand-slug" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="标签" name="tagsText" extra="每行一个标签">
                      <Input.TextArea rows={5} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="SEO 标题" name="seoTitle">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="SEO 描述" name="seoDescription">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Form>
    </Space>
  );

  const sharedFieldsPanel = (
    <div className="content-editor-shared-section">
      <Row gutter={[16, 0]}>
        <Col xs={24} md={16}>
          <Form.Item label="官网链接" layout="vertical" style={{ marginBottom: 16 }}>
            <Input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="启用状态" layout="vertical" style={{ marginBottom: 16 }}>
            <Switch
              checked={status === 'active'}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="Logo" layout="vertical" style={{ marginBottom: 0 }}>
            <CoverImageField
              value={logoUrl}
              onChange={setLogoUrl}
              folder="brands/logos"
              uploadLabel="上传 Logo"
              previewAlt="Logo 预览"
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
        title={modalTitle}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        destroyOnHidden
        confirmLoading={isPending || loadingGroup}
        className="content-editor-modal brand-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        {!hasLanguages ? (
          <Empty description="尚未配置站点语言，请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages">
              <Button type="primary">前往多语言管理</Button>
            </Link>
          </Empty>
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space wrap>
                <Button loading={isPending} onClick={() => persistAllLocales(false)}>
                  {isEditing ? '保存' : '保存品牌'}
                </Button>
                <Button type="primary" loading={isPending} onClick={() => persistAllLocales(true)}>
                  保存并关闭
                </Button>
              </Space>
            </div>

            {sharedFieldsPanel}

            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((language) => {
                  const isActive = language.code === activeLocale;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      className={`content-editor-locale-tab${isActive ? ' is-active' : ''}`}
                      onClick={() => handleLocaleChange(language.code)}
                    >
                      {localeTabLabel(language, drafts[language.code])}
                    </button>
                  );
                })}
              </div>
              <div className="content-editor-main">
                {editorPanel}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
