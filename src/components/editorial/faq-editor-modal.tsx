'use client';

import { Button, Col, Empty, Form, Input, Modal, Row, Space, Tag, Alert, Popconfirm, message } from 'antd';
import type { FormInstance } from 'antd';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { BoardMultiSelect } from '@/components/editorial/board-multi-select';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import {
  defaultEditorialContentBody,
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialEntryStatus,
  resolveContentId,
} from '@/lib/editorial-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';
import type { EditorialBoardOption } from '@/components/editorial/board-multi-select';

type LocaleFormValues = {
  title: string;
  body: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  publishedAt: string;
  persisted: boolean;
  status: EditorialEntryStatus;
};

type FaqEditorModalProps = {
  open: boolean;
  boardKey: string;
  boardLabel: string;
  availableBoards: EditorialBoardOption[];
  activeLanguages: AdminSiteLanguageRow[];
  editingEntry: AdminEditorialContentListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminEditorialContentTranslation) => void;
};

type PersistMode = 'save' | 'publish';

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function createEmptyDraft(): LocaleDraft {
  return {
    title: '',
    body: defaultEditorialContentBody,
    publishedAt: '',
    persisted: false,
    status: 'draft',
  };
}

function entryToDraft(entry: AdminEditorialContentTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    title: entry.title,
    body: entry.payload.body,
    publishedAt: toLocalDateTimeValue(entry.publishedAt),
    persisted: true,
    status: entry.status,
  };
}

function resolveTargetStatus(draft: LocaleDraft, mode: PersistMode): EditorialEntryStatus {
  if (mode === 'publish') return 'published';
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
  return Boolean(draft.title.trim() || hasMeaningfulHtmlBody(draft.body));
}

function validateDraft(locale: string, draft: LocaleDraft) {
  if (!draft.title.trim()) {
    return { ok: false as const, locale, message: '请输入标题' };
  }
  if (!hasMeaningfulHtmlBody(draft.body)) {
    return { ok: false as const, locale, message: '请输入正文' };
  }
  return { ok: true as const };
}

function buildEntryPayload(draft: LocaleDraft, locale: string, status: EditorialEntryStatus, options: {
  contentId: string;
  boardKey: string;
  boardKeys: string[];
}) {
  return {
    contentType: 'content' as const,
    contentModule: 'faq' as const,
    contentId: options.contentId ? options.contentId : undefined,
    boardKey: options.boardKey,
    boardKeys: options.boardKeys,
    title: draft.title.trim(),
    locale,
    status,
    publishedAt: status === 'published' ? null : draft.publishedAt ? new Date(draft.publishedAt).toISOString() : null,
    payload: {
      body: draft.body.trim(),
      coverUrl: null,
      coverAlt: null,
      tags: [],
      relatedProductSlugs: [],
    },
  };
}

function EditorActionButtons({
  isEditing,
  isPublished,
  isPending,
  onSave,
  onPublish,
}: {
  isEditing: boolean;
  isPublished: boolean;
  isPending: boolean;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <Space wrap>
      <Button loading={isPending} onClick={onSave}>{isEditing ? '保存' : '保存为草稿'}</Button>
      {isPublished ? null : (
        <Popconfirm
          title="确定立即发布吗？"
          description="发布后内容将对访客可见。"
          onConfirm={onPublish}
        >
          <Button type="primary" loading={isPending}>立即发布</Button>
        </Popconfirm>
      )}
    </Space>
  );
}

export function FaqEditorModal({
  open,
  boardKey,
  boardLabel,
  availableBoards,
  activeLanguages,
  editingEntry,
  onClose,
  onSaved,
}: FaqEditorModalProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const [isPending, startTransition] = useTransition();
  const [contentId, setContentId] = useState('');
  const [boardKeys, setBoardKeys] = useState<string[]>([boardKey]);
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [activeLocale, setActiveLocale] = useState('');
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const isArchived = editingEntry?.status === 'archived';
  const isPublished = editingEntry?.status === 'published';
  const isReadOnly = isArchived;
  const modalTitle = (
    <Space wrap>
      <span>{isEditing ? `编辑 FAQ · ${editingEntry?.title ?? boardLabel}` : `新建 FAQ · ${boardLabel}`}</span>
      {isArchived ? <Tag color="red">已归档</Tag> : null}
      {isPublished ? <Tag color="green">已发布</Tag> : null}
    </Space>
  );

  function loadDraft(locale: string, nextDrafts: Record<string, LocaleDraft>) {
    const draft = nextDrafts[locale] ?? createEmptyDraft();
    form.setFieldsValue({
      title: draft.title,
      body: draft.body,
    });
  }

  useEffect(() => {
    if (!open) return;

    const initialContentId = editingEntry?.id ?? '';
    setContentId(initialContentId);
    setBoardKeys(editingEntry?.boardKeys?.length ? editingEntry.boardKeys : [boardKey]);

    const seedDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));
    const nextLocale = editingEntry?.primaryLocale ?? defaultLocale;

    if (editingEntry) {
      seedDrafts[editingEntry.primaryLocale] = {
        ...createEmptyDraft(),
        title: editingEntry.title,
        body: defaultEditorialContentBody,
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

        setDrafts(mergedDrafts);
        loadDraft(nextLocale, mergedDrafts);
        setEditorRevision((current) => current + 1);
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
    setEditorRevision((current) => current + 1);
  }

  function persistAllLocales(mode: PersistMode) {
    if (isReadOnly) return;
    if (mode === 'publish' && isPublished) return;
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
            })),
          },
        );

        if (!response.ok) {
          const language = activeLanguages.find((item) => item.code === locale);
          void messageApi.error(`${language?.nativeName ?? locale} 保存失败，请稍后重试`);
          if (savedEntries.length > 0) {
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

      const statusLabel = mode === 'publish' ? '发布' : isEditing ? '保存' : '保存为草稿';
      void messageApi.success(`已${statusLabel} ${savedEntries.length} 个语言版本`);
    });
  }

  const actionButtons = hasLanguages && !isReadOnly ? (
    <EditorActionButtons
      isEditing={isEditing}
      isPublished={isPublished}
      isPending={isPending}
      onSave={() => persistAllLocales('save')}
      onPublish={() => persistAllLocales('publish')}
    />
  ) : null;

  const editorPanel = (
    <Space orientation="vertical" size="middle" style={{ width: '100%', minWidth: 0 }}>
      <Form<LocaleFormValues> form={form} layout="vertical" disabled={isReadOnly} preserve>
        <Row gutter={[16, 0]}>
          <Col span={24}>
            <Form.Item label="所属看板" required>
              <BoardMultiSelect
                boards={availableBoards}
                contentModule="faq"
                lockedBoardKey={boardKey}
                value={boardKeys}
                onChange={setBoardKeys}
                disabled={isReadOnly}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="请输入标题" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="内容"
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
                disabled={isReadOnly || loadingGroup}
              />
            </Form.Item>
          </Col>
        </Row>
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
    </>
  );
}
