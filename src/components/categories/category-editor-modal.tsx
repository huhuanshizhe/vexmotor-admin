'use client';

import { Button, Col, Empty, Form, Input, InputNumber, Modal, Row, Space, Switch, Tabs, Tag, TreeSelect, message } from 'antd';
import type { FormInstance } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  type AdminCategoryListItem,
  type AdminCategoryTranslation,
  type AdminCategoryTreeNode,
  type CategoryStatus,
  resolveCategoryId,
} from '@/lib/category-content';
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

type CategoryEditorModalProps = {
  open: boolean;
  editorLoading?: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  editingEntry: AdminCategoryListItem | null;
  defaultParentId?: string | null;
  tree: AdminCategoryTreeNode[];
  onClose: () => void;
  onSaved: (entry: AdminCategoryTranslation) => void;
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

function entryToDraft(entry: AdminCategoryTranslation): LocaleDraft {
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
  if (!draft.name.trim()) {
    return { ok: false as const, locale, section: 'content' as const, message: '请输入分类名称' };
  }
  if (!draft.slug.trim()) {
    return { ok: false as const, locale, section: 'seo' as const, message: '请输入 Slug' };
  }
  return { ok: true as const };
}

function collectDescendantIds(nodeId: string, tree: AdminCategoryTreeNode[]): Set<string> {
  const result = new Set<string>();
  const collectSubtree = (node: AdminCategoryTreeNode) => {
    result.add(node.id);
    for (const child of node.children) collectSubtree(child);
  };
  const findNode = (nodes: AdminCategoryTreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        collectSubtree(node);
        return true;
      }
      if (findNode(node.children)) return true;
    }
    return false;
  };
  findNode(tree);
  return result;
}

function buildTreeSelectData(
  nodes: AdminCategoryTreeNode[],
  disabledIds: Set<string>,
): Array<{ value: string; title: string; disabled?: boolean; children?: ReturnType<typeof buildTreeSelectData> }> {
  return nodes.map((node) => ({
    value: node.id,
    title: node.name,
    disabled: disabledIds.has(node.id),
    children: node.children.length ? buildTreeSelectData(node.children, disabledIds) : undefined,
  }));
}

function buildTranslationPayload(
  draft: LocaleDraft,
  locale: string,
  options: {
    categoryId: string;
    parentId: string | null;
    imageUrl: string | null;
    status: CategoryStatus;
    sortOrder: number;
    isFeatured: boolean;
    featuredOrder: number;
  },
) {
  return {
    categoryId: options.categoryId ? options.categoryId : undefined,
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    description: draft.description.trim() || null,
    locale,
    seoTitle: draft.seoTitle.trim() || null,
    seoDescription: draft.seoDescription.trim() || null,
    imageUrl: options.imageUrl,
    parentId: options.parentId,
    status: options.status,
    sortOrder: options.sortOrder,
    isFeatured: options.isFeatured,
    featuredOrder: options.featuredOrder,
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

export function CategoryEditorModal({
  open,
  editorLoading = false,
  activeLanguages,
  editingEntry,
  defaultParentId = null,
  tree,
  onClose,
  onSaved,
}: CategoryEditorModalProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [activeLocale, setActiveLocale] = useState('');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<CategoryStatus>('active');

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const modalTitle = (
    <Space wrap>
      <span>{isEditing ? `编辑分类 · ${editingEntry?.name ?? ''}` : '新建分类'}</span>
      {status === 'active' ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>}
    </Space>
  );

  const parentTreeData = useMemo(() => {
    const disabled = editingEntry ? collectDescendantIds(editingEntry.id, tree) : new Set<string>();
    if (editingEntry) disabled.add(editingEntry.id);
    return buildTreeSelectData(tree, disabled);
  }, [editingEntry, tree]);

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

    const initialCategoryId = editingEntry?.id ?? '';
    setCategoryId(initialCategoryId);
    setParentId(editingEntry?.parentId ?? defaultParentId ?? null);
    setSortOrder(editingEntry?.sortOrder ?? 0);
    setIsFeatured(editingEntry?.isFeatured ?? false);
    setFeaturedOrder(editingEntry?.featuredOrder ?? 0);
    setImageUrl(editingEntry?.imageUrl ?? null);
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
        const response = await fetch(`/api/admin/categories/${initialCategoryId}`);
        const payload = response.ok
          ? (await response.json()) as { item: AdminCategoryListItem; translations: AdminCategoryTranslation[] }
          : { item: null, translations: [] as AdminCategoryTranslation[] };

        if (payload.item) {
          setParentId(payload.item.parentId);
          setSortOrder(payload.item.sortOrder);
          setIsFeatured(payload.item.isFeatured);
          setFeaturedOrder(payload.item.featuredOrder);
          setImageUrl(payload.item.imageUrl);
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
  }, [open, editingEntry, defaultParentId, activeLanguages, defaultLocale, form, hasLanguages, messageApi]);

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
    }

    startTransition(async () => {
      let nextCategoryId = categoryId;
      const nextDrafts = { ...mergedDrafts };
      const savedEntries: AdminCategoryTranslation[] = [];
      const shared = {
        parentId,
        imageUrl,
        status,
        sortOrder,
        isFeatured: isEditing ? isFeatured : false,
        featuredOrder: isEditing ? featuredOrder : 0,
      };

      if (nextCategoryId) {
        const patchResponse = await fetch(`/api/admin/categories/${nextCategoryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          void messageApi.error('分类基础信息保存失败');
          return;
        }
      }

      for (const { locale, draft } of targets) {
        const response = await fetch(
          draft.entryId
            ? `/api/admin/categories/translations/${draft.entryId}`
            : '/api/admin/categories',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationPayload(draft, locale, {
              categoryId: nextCategoryId,
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

        const saved = (await response.json()) as AdminCategoryTranslation;
        nextCategoryId = resolveCategoryId(saved);
        nextDrafts[locale] = {
          ...draft,
          entryId: saved.id,
          persisted: true,
        };
        savedEntries.push(saved);
      }

      setDrafts(nextDrafts);
      setCategoryId(nextCategoryId);
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
                    <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
                      <Input placeholder="请输入分类名称" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="分类描述" name="description">
                      <Input.TextArea rows={4} placeholder="请输入分类描述" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="启用状态">
                      <Switch
                        checked={status === 'active'}
                        checkedChildren="启用"
                        unCheckedChildren="停用"
                        onChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
                      />
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
                      extra="同一语言下的分类 slug 不可重复"
                      rules={[{ required: true, message: '请输入 slug' }]}
                    >
                      <Input placeholder="category-slug" />
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
        <Col xs={24} md={12}>
          <Form.Item label="上级分类" layout="vertical" style={{ marginBottom: 16 }}>
            <TreeSelect
              allowClear
              treeDefaultExpandAll
              placeholder="顶级分类"
              value={parentId ?? undefined}
              treeData={parentTreeData}
              onChange={(value) => setParentId((value as string | undefined) ?? null)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="排序" layout="vertical" style={{ marginBottom: 16 }}>
            <InputNumber value={sortOrder} onChange={(value) => setSortOrder(Number(value ?? 0))} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        {isEditing ? (
          <>
            <Col xs={24} md={12}>
              <Form.Item label="推荐到首页" layout="vertical" style={{ marginBottom: 16 }}>
                <Switch checked={isFeatured} onChange={setIsFeatured} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="首页展示顺序" layout="vertical" style={{ marginBottom: 16 }}>
                <InputNumber value={featuredOrder} onChange={(value) => setFeaturedOrder(Number(value ?? 0))} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </>
        ) : null}
        <Col span={24}>
          <Form.Item label="Logo" layout="vertical" style={{ marginBottom: 0 }}>
            <CoverImageField
              value={imageUrl}
              onChange={setImageUrl}
              folder="categories/logos"
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
        confirmLoading={editorLoading || isPending || loadingGroup}
        className="content-editor-modal category-editor-modal"
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
                  {isEditing ? '保存' : '保存分类'}
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
