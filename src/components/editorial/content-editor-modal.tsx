'use client';

import { Button, Col, Empty, Form, Input, Modal, Row, Space, Tabs, Tag, Typography, Alert, Popconfirm, message } from 'antd';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { AdminDateTimePicker } from '@/components/admin/admin-datetime-picker';
import { BoardMultiSelect } from '@/components/editorial/board-multi-select';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import {
  defaultEditorialContentBody,
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialEntryStatus,
  resolveContentId,
} from '@/lib/editorial-content';
import { validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';
import type { EditorialBoardOption } from '@/components/editorial/board-multi-select';

type SectionTabKey = 'content' | 'seo';

type LocaleFormValues = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverUrl: string;
  coverAlt: string;
  tagsText: string;
  relatedProductSlugsText: string;
  seoTitle: string;
  seoDescription: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  publishedAt: string;
  persisted: boolean;
  status: EditorialEntryStatus;
};

type ContentEditorModalProps = {
  open: boolean;
  boardKey: string;
  boardLabel: string;
  availableBoards: EditorialBoardOption[];
  activeLanguages: AdminSiteLanguageRow[];
  editingEntry: AdminEditorialContentListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminEditorialContentTranslation) => void;
};

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function createEmptyDraft(): LocaleDraft {
  return {
    title: '',
    slug: '',
    summary: '',
    body: defaultEditorialContentBody,
    coverUrl: '',
    coverAlt: '',
    publishedAt: '',
    tagsText: '',
    relatedProductSlugsText: '',
    seoTitle: '',
    seoDescription: '',
    persisted: false,
    status: 'draft',
  };
}

function entryToDraft(entry: AdminEditorialContentTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    title: entry.title,
    slug: entry.slug,
    summary: entry.summary ?? '',
    body: entry.payload.body,
    coverUrl: entry.payload.coverUrl ?? '',
    coverAlt: entry.payload.coverAlt ?? '',
    publishedAt: toLocalDateTimeValue(entry.publishedAt),
    tagsText: entry.payload.tags.join('\n'),
    relatedProductSlugsText: entry.payload.relatedProductSlugs.join('\n'),
    seoTitle: entry.seoTitle ?? '',
    seoDescription: entry.seoDescription ?? '',
    persisted: true,
    status: entry.status,
  };
}

type PersistMode = 'save' | 'publish' | 'schedule';

function resolveTargetStatus(draft: LocaleDraft, mode: PersistMode): EditorialEntryStatus {
  if (mode === 'publish' || mode === 'schedule') return 'published';
  if (draft.persisted) return draft.status;
  return 'draft';
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
      body: hasMeaningfulHtmlBody(values.body ?? '') ? values.body : previous.body,
    },
  };
}

function shouldPersistDraft(draft: LocaleDraft) {
  if (draft.persisted) return true;
  return Boolean(
    draft.title.trim()
    || draft.slug.trim()
    || draft.summary.trim()
    || hasMeaningfulHtmlBody(draft.body),
  );
}

function validateDraft(locale: string, draft: LocaleDraft) {
  if (!draft.title.trim()) {
    return { ok: false as const, locale, message: '请输入标题', section: 'content' as const };
  }
  if (!hasMeaningfulHtmlBody(draft.body)) {
    return { ok: false as const, locale, message: '请输入正文', section: 'content' as const };
  }
  return validateSourceThenAutoSlug({
    locale,
    sourceText: draft.title,
    slug: draft.slug,
    emptySourceMessage: '请输入标题',
    section: 'content',
  });
}

function buildEntryPayload(draft: LocaleDraft, locale: string, status: EditorialEntryStatus, options: {
  contentId: string;
  boardKey: string;
  boardKeys: string[];
  publishedAt?: string | null;
}) {
  const publishedAt = options.publishedAt !== undefined
    ? options.publishedAt
    : status === 'published'
      ? null
      : draft.publishedAt
        ? new Date(draft.publishedAt).toISOString()
        : null;

  return {
    contentType: 'content' as const,
    contentModule: 'editorial' as const,
    contentId: options.contentId ? options.contentId : undefined,
    boardKey: options.boardKey,
    boardKeys: options.boardKeys,
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    summary: draft.summary.trim() || null,
    locale,
    status,
    seoTitle: draft.seoTitle.trim() || null,
    seoDescription: draft.seoDescription.trim() || null,
    publishedAt,
    payload: {
      body: draft.body.trim(),
      coverUrl: draft.coverUrl.trim() || null,
      coverAlt: draft.coverAlt.trim() || null,
      tags: splitMultiline(draft.tagsText),
      relatedProductSlugs: splitMultiline(draft.relatedProductSlugsText),
    },
  };
}

function EditorActionButtons({
  isEditing,
  isArchived,
  isPublished,
  isPending,
  onSave,
  onPublish,
  onSchedule,
}: {
  isEditing: boolean;
  isArchived: boolean;
  isPublished: boolean;
  isPending: boolean;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: () => void;
}) {
  if (isArchived) return null;

  return (
    <Space wrap>
      <Button loading={isPending} onClick={onSave}>{isEditing ? '保存' : '保存为草稿'}</Button>
      {isPublished ? null : (
        <>
          <Popconfirm
            title="确定立即发布吗？"
            description="发布后内容将对访客可见。"
            onConfirm={onPublish}
          >
            <Button type="primary" loading={isPending}>立即发布</Button>
          </Popconfirm>
          <Button loading={isPending} onClick={onSchedule}>定时发布</Button>
        </>
      )}
    </Space>
  );
}

export function ContentEditorModal({
  open,
  boardKey,
  boardLabel,
  availableBoards,
  activeLanguages,
  editingEntry,
  onClose,
  onSaved,
}: ContentEditorModalProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const [isPending, startTransition] = useTransition();
  const [contentId, setContentId] = useState('');
  const [boardKeys, setBoardKeys] = useState<string[]>([boardKey]);
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [activeLocale, setActiveLocale] = useState('');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState<Dayjs | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const isArchived = editingEntry?.status === 'archived';
  const isPublished = editingEntry?.status === 'published';
  const isReadOnly = isArchived;
  const modalTitle = (
    <Space wrap>
      <span>{isEditing ? `编辑内容 · ${editingEntry?.title ?? boardLabel}` : `新建内容 · ${boardLabel}`}</span>
      {isArchived ? <Tag color="red">已归档</Tag> : null}
      {isPublished ? <Tag color="green">已发布</Tag> : null}
    </Space>
  );

  function loadDraft(locale: string, nextDrafts: Record<string, LocaleDraft>) {
    const draft = nextDrafts[locale] ?? createEmptyDraft();
    form.setFieldsValue({
      title: draft.title,
      slug: draft.slug,
      summary: draft.summary,
      body: draft.body,
      coverUrl: draft.coverUrl,
      coverAlt: draft.coverAlt,
      tagsText: draft.tagsText,
      relatedProductSlugsText: draft.relatedProductSlugsText,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
    });
  }

  useEffect(() => {
    if (!open) return;

    const initialContentId = editingEntry?.id ?? '';
    setContentId(initialContentId);
    setBoardKeys(editingEntry?.boardKeys?.length ? editingEntry.boardKeys : [boardKey]);
    setSectionTab('content');
    setScheduleOpen(false);

    const seedDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));
    const nextLocale = editingEntry?.primaryLocale ?? defaultLocale;

    if (editingEntry) {
      seedDrafts[editingEntry.primaryLocale] = {
        ...createEmptyDraft(),
        title: editingEntry.title,
        slug: editingEntry.slug,
        summary: editingEntry.summary ?? '',
        persisted: true,
        status: editingEntry.status,
        publishedAt: toLocalDateTimeValue(editingEntry.publishedAt),
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
    setEditorRevision((current) => current + 1);

    if (!editingEntry) {
      setLoadingGroup(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/content/${initialContentId}`);
        const payload = response.ok
          ? (await response.json()) as { item: AdminEditorialContentListItem; translations: AdminEditorialContentTranslation[] }
          : { item: null, translations: [] as AdminEditorialContentTranslation[] };

        if (payload.item?.boardKeys?.length) {
          setBoardKeys(payload.item.boardKeys);
        }

        const mergedDrafts = { ...seedDrafts };
        for (const item of payload.translations) {
          mergedDrafts[item.locale] = entryToDraft(item);
        }
        if (editingEntry && !mergedDrafts[editingEntry.primaryLocale]) {
          mergedDrafts[editingEntry.primaryLocale] = {
            ...createEmptyDraft(),
            title: editingEntry.title,
            slug: editingEntry.slug,
            summary: editingEntry.summary ?? '',
            persisted: true,
            status: editingEntry.status,
            publishedAt: toLocalDateTimeValue(editingEntry.publishedAt),
          };
        }

        setDrafts(mergedDrafts);
        loadDraft(nextLocale, mergedDrafts);
        setEditorRevision((current) => current + 1);
      } catch {
        const fallbackDrafts = {
          ...seedDrafts,
          [editingEntry.primaryLocale]: seedDrafts[editingEntry.primaryLocale] ?? {
            ...createEmptyDraft(),
            title: editingEntry.title,
            slug: editingEntry.slug,
            summary: editingEntry.summary ?? '',
            persisted: true,
            status: editingEntry.status,
            publishedAt: toLocalDateTimeValue(editingEntry.publishedAt),
          },
        };
        setDrafts(fallbackDrafts);
        loadDraft(nextLocale, fallbackDrafts);
        setEditorRevision((current) => current + 1);
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
    setEditorRevision((current) => current + 1);
  }

  function handleSectionChange(nextSection: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setSectionTab(nextSection as SectionTabKey);
  }

  function focusValidationIssue(locale: string, section: SectionTabKey, mergedDrafts: Record<string, LocaleDraft>) {
    setDrafts(mergedDrafts);
    setActiveLocale(locale);
    setSectionTab(section);
    loadDraft(locale, mergedDrafts);
  }

  function persistAllLocales(mode: PersistMode, options?: { publishedAt?: string | null }) {
    if (isReadOnly) return;
    if ((mode === 'publish' || mode === 'schedule') && isPublished) return;
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
        focusValidationIssue(validation.locale, validation.section, mergedDrafts);
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
      let nextContentId = contentId;
      const nextDrafts = { ...mergedDrafts };
      const savedEntries: AdminEditorialContentTranslation[] = [];

      for (const { locale, draft } of targets) {
        const targetStatus = resolveTargetStatus(draft, mode);
        const response = await fetch(
          draft.entryId
            ? `/api/admin/editorial/content/translations/${draft.entryId}`
            : '/api/admin/editorial/content',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildEntryPayload(draft, locale, targetStatus, {
              contentId: nextContentId,
              boardKey,
              boardKeys,
              publishedAt: options?.publishedAt,
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
            setDrafts(nextDrafts);
            setContentId(nextContentId);
            for (const saved of savedEntries) onSaved(saved);
          }
          return;
        }

        const saved = (await response.json()) as AdminEditorialContentTranslation;
        nextContentId = resolveContentId(saved);
        nextDrafts[locale] = {
          ...draft,
          entryId: saved.id,
          publishedAt: toLocalDateTimeValue(saved.publishedAt),
          persisted: true,
          status: saved.status,
        };
        savedEntries.push(saved);
      }

      setDrafts(nextDrafts);
      setContentId(nextContentId);
      loadDraft(activeLocale, nextDrafts);
      for (const saved of savedEntries) onSaved(saved);

      const statusLabel = mode === 'publish' || mode === 'schedule'
        ? (options?.publishedAt && Date.parse(options.publishedAt) > Date.now() ? '设置定时发布' : '发布')
        : isEditing
          ? '保存'
          : '保存为草稿';
      void messageApi.success(`已${statusLabel} ${savedEntries.length} 个语言版本`);
    });
  }

  function openScheduleModal() {
    const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    const scheduledDraft = Object.values(mergedDrafts).find(
      (draft) => draft.publishedAt && Date.parse(draft.publishedAt) > Date.now(),
    );
    const preset = scheduledDraft?.publishedAt
      ? dayjs(scheduledDraft.publishedAt)
      : dayjs().add(1, 'hour').minute(0).second(0).millisecond(0);
    setScheduleValue(preset);
    setScheduleOpen(true);
  }

  function confirmSchedulePublish() {
    if (!scheduleValue) {
      void messageApi.error('请选择发布时间');
      return;
    }
    if (!scheduleValue.isAfter(dayjs())) {
      void messageApi.error('定时发布时间必须晚于当前时间');
      return;
    }
    setScheduleOpen(false);
    persistAllLocales('schedule', { publishedAt: scheduleValue.toISOString() });
  }

  const actionButtons = hasLanguages ? (
    <EditorActionButtons
      isEditing={isEditing}
      isArchived={isArchived}
      isPublished={isPublished}
      isPending={isPending}
      onSave={() => persistAllLocales('save')}
      onPublish={() => persistAllLocales('publish')}
      onSchedule={openScheduleModal}
    />
  ) : null;

  const editorPanel = (
    <Space orientation="vertical" size="middle" style={{ width: '100%', minWidth: 0 }}>
      <Tabs
        activeKey={sectionTab}
        onChange={handleSectionChange}
        items={[
          { key: 'content', label: '内容' },
          { key: 'seo', label: 'SEO' },
        ]}
      />

      <Form<LocaleFormValues> form={form} layout="vertical" disabled={isReadOnly} preserve>
        <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
          <Row gutter={[16, 0]}>
            <Col span={24}>
              <Form.Item label="所属看板" required>
                <BoardMultiSelect
                  boards={availableBoards}
                  contentModule="editorial"
                  lockedBoardKey={boardKey}
                  value={boardKeys}
                  onChange={setBoardKeys}
                  disabled={isReadOnly}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="摘要" name="summary" extra="留空时将根据正文自动提取">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="正文"
                name="body"
                required
                rules={[{
                  validator: async (_, value: string) => {
                    if (!hasMeaningfulHtmlBody(value)) {
                      throw new Error('请输入正文内容');
                    }
                  },
                }]}
              >
                <RichTextEditor
                  key={`${activeLocale}-${editorRevision}`}
                  minHeight={520}
                  maxHeight={720}
                  disabled={isReadOnly}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="封面图" name="coverUrl">
                <CoverImageField />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="封面 Alt" name="coverAlt">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </div>
        <div style={{ display: sectionTab === 'seo' ? 'block' : 'none' }}>
          <Row gutter={[16, 0]}>
            <Col span={24}>
              <Form.Item
                label="Slug"
                name="slug"
                extra="留空将根据标题自动生成；同一语言下的内容 slug 不可重复（与商品等业务线互不影响）"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="标签" name="tagsText" extra="每行一个标签">
                <Input.TextArea rows={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="关联产品 Slug" name="relatedProductSlugsText" extra="每行一个 slug">
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
        </div>
      </Form>
    </Space>
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
        className="content-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{
          body: { overflow: 'visible', minWidth: 0 },
        }}
      >
        {!hasLanguages ? (
          <Empty description="尚未配置站点语言，请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages">
              <Button type="primary">前往多语言管理</Button>
            </Link>
          </Empty>
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            {isArchived ? (
              <Alert
                type="warning"
                showIcon
                message="该内容已归档"
                description="归档内容为只读，无法编辑或保存。"
              />
            ) : null}
            {!isArchived ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {actionButtons}
              </div>
            ) : null}

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
                {editorPanel}
              </div>
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        title="设置定时发布时间"
        open={scheduleOpen}
        onCancel={() => setScheduleOpen(false)}
        onOk={confirmSchedulePublish}
        okText="确认定时发布"
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            将所有已填写的语言版本保存为已发布状态，并统一使用所选发布时间。
          </Typography.Text>
          <AdminDateTimePicker
            mode="datetime"
            value={scheduleValue}
            onChange={(value) => setScheduleValue(value)}
            disabledDate={(current) => current.isBefore(dayjs().startOf('day'))}
          />
        </Space>
      </Modal>
    </>
  );
}
