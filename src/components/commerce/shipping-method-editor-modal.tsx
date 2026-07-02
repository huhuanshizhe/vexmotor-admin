'use client';

import { Form, Input, Modal, Space, Switch, Tabs, message } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useRef, useState, useTransition } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { runDefaultLocaleSaveGate } from '@/lib/admin-default-locale-save';
import { resolveSlugForSave } from '@/lib/slug';
import type { AdminShippingMethodListItem, AdminShippingMethodTranslation } from '@/lib/shipping-method-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleFormValues = {
  name: string;
  etaLabel: string;
  note: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type ShippingMethodEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  defaultLocale: string;
  editingEntry: AdminShippingMethodListItem | null;
  onClose: () => void;
  onSaved: () => void;
};

function createEmptyDraft(): LocaleDraft {
  return { name: '', etaLabel: '', note: '', persisted: false };
}

function entryToDraft(entry: AdminShippingMethodTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    name: entry.name,
    etaLabel: entry.etaLabel,
    note: entry.note ?? '',
    persisted: true,
  };
}

function cloneDraftMap(drafts: Record<string, LocaleDraft>) {
  return Object.fromEntries(Object.entries(drafts).map(([locale, draft]) => [locale, { ...draft }]));
}

function draftChanged(baseline: LocaleDraft | undefined, draft: LocaleDraft) {
  if (!baseline?.persisted) return true;
  return draft.name !== baseline.name
    || draft.etaLabel !== baseline.etaLabel
    || draft.note !== baseline.note;
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
      name: values.name ?? '',
      etaLabel: values.etaLabel ?? '',
      note: values.note ?? '',
    },
  };
}

function validateDraft(locale: string, draft: LocaleDraft) {
  if (!draft.name.trim()) {
    return { ok: false as const, locale, message: '请输入名称' };
  }
  return { ok: true as const };
}

function buildTranslationPayload(
  draft: LocaleDraft,
  locale: string,
  shared: { shippingMethodId?: string; code: string; enabled: boolean; sortOrder: number },
) {
  return {
    shippingMethodId: shared.shippingMethodId,
    locale,
    name: draft.name.trim(),
    etaLabel: draft.etaLabel.trim(),
    note: draft.note.trim() || null,
    code: shared.code,
    enabled: shared.enabled,
    sortOrder: shared.sortOrder,
  };
}

export function ShippingMethodEditorModal({
  open,
  activeLanguages,
  defaultLocale,
  editingEntry,
  onClose,
  onSaved,
}: ShippingMethodEditorModalProps) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [sharedForm] = Form.useForm<{ code: string; enabled: boolean }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeLocale, setActiveLocale] = useState(defaultLocale);
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const baselineDraftsRef = useRef<Record<string, LocaleDraft>>({});
  const activeLocaleRef = useRef(defaultLocale);
  const [methodId, setMethodId] = useState<string | undefined>(editingEntry?.id);
  const [sortOrder, setSortOrder] = useState(editingEntry?.sortOrder ?? 0);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasLanguages = activeLanguages.length > 0;

  useEffect(() => {
    activeLocaleRef.current = activeLocale;
  }, [activeLocale]);

  useEffect(() => {
    if (!open) return;

    const nextLocale = editingEntry?.primaryLocale
      ?? activeLanguages.find((item) => item.code === defaultLocale)?.code
      ?? activeLanguages[0]?.code
      ?? defaultLocale;

    const seedDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));

    if (editingEntry) {
      seedDrafts[editingEntry.primaryLocale] = {
        ...createEmptyDraft(),
        name: editingEntry.name,
        etaLabel: editingEntry.etaLabel,
        note: editingEntry.note ?? '',
        persisted: true,
      };
    }

    setMethodId(editingEntry?.id);
    setSortOrder(editingEntry?.sortOrder ?? 0);
    sharedForm.setFieldsValue({
      code: editingEntry?.code ?? '',
      enabled: editingEntry?.enabled ?? false,
    });
    setLoadingGroup(Boolean(editingEntry));
    setActiveLocale(nextLocale);
    activeLocaleRef.current = nextLocale;
    baselineDraftsRef.current = cloneDraftMap(seedDrafts);
    setDrafts(seedDrafts);
    form.resetFields();
    form.setFieldsValue(seedDrafts[nextLocale] ?? createEmptyDraft());

    if (!editingEntry) {
      setLoadingGroup(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/admin/shipping-methods/${editingEntry.id}`);
        const payload = response.ok
          ? (await response.json()) as { item: AdminShippingMethodListItem; translations: AdminShippingMethodTranslation[] }
          : { item: null, translations: [] as AdminShippingMethodTranslation[] };

        if (payload.item) {
          sharedForm.setFieldsValue({
            code: payload.item.code,
            enabled: payload.item.enabled,
          });
          setSortOrder(payload.item.sortOrder);
        }

        const mergedDrafts = { ...seedDrafts };
        for (const item of payload.translations) {
          mergedDrafts[item.locale] = entryToDraft(item);
        }

        const localeForForm = activeLocaleRef.current;
        baselineDraftsRef.current = cloneDraftMap(mergedDrafts);
        setDrafts(mergedDrafts);
        form.resetFields();
        form.setFieldsValue(mergedDrafts[localeForForm] ?? createEmptyDraft());
      } catch {
        void messageApi.warning('加载多语言版本失败，已回退到当前条目');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, defaultLocale, form, sharedForm, messageApi]);

  function loadDraft(locale: string, nextDrafts: Record<string, LocaleDraft>) {
    const draft = nextDrafts[locale] ?? createEmptyDraft();
    form.resetFields();
    form.setFieldsValue({
      name: draft.name,
      etaLabel: draft.etaLabel,
      note: draft.note,
    });
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    loadDraft(nextLocale, merged);
    setActiveLocale(nextLocale);
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale, form);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? createEmptyDraft();
    return {
      name: draft.name,
      etaLabel: draft.etaLabel,
      note: draft.note,
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? createEmptyDraft();
    return Boolean(draft.name.trim() || draft.etaLabel.trim() || draft.note.trim());
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? createEmptyDraft();
    const nextDraft = applyNonemptyTranslatedFields(current, fields);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue({
      name: nextDraft.name,
      etaLabel: nextDraft.etaLabel,
      note: nextDraft.note,
    });
  }

  function persistAllLocales() {
    if (!hasLanguages) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
      return;
    }

    void sharedForm.validateFields().then((sharedValues) => {
      const normalizedCode = resolveSlugForSave({ sourceText: sharedValues.code, slug: sharedValues.code });
      if (!normalizedCode) {
        void messageApi.error('请填写有效编码');
        return;
      }

      const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
      const defaultDraft = mergedDrafts[defaultLocale] ?? createEmptyDraft();

      const targets = activeLanguages
        .map((language) => ({ locale: language.code, draft: mergedDrafts[language.code] ?? createEmptyDraft() }))
        .filter((target) => shouldPersistLocaleDraft({
          locale: target.locale,
          defaultLocale,
          primaryText: target.draft.name,
        }))
        .filter((target) => draftChanged(baselineDraftsRef.current[target.locale], target.draft));

      if (!targets.length) {
        void messageApi.warning('没有需要保存的变更');
        return;
      }

      const savingDefaultLocale = targets.some((target) => target.locale === defaultLocale);
      if (savingDefaultLocale) {
        const gate = runDefaultLocaleSaveGate({
          defaultLocale,
          mergedDrafts,
          createEmptyDraft,
          validateDraft,
        });
        if (!gate.ok) {
          setDrafts(mergedDrafts);
          setActiveLocale(gate.validation.locale || defaultLocale);
          loadDraft(gate.validation.locale || defaultLocale, mergedDrafts);
          void messageApi.error(gate.validation.message);
          return;
        }
      } else if (!defaultDraft.persisted) {
        void messageApi.error('请先在默认语言下保存内容，再保存其他语言');
        return;
      }

      const workingDrafts = mergedDrafts;

      for (const target of targets) {
        const validation = validateDraft(target.locale, target.draft);
        if (!validation.ok) {
          setDrafts(workingDrafts);
          setActiveLocale(validation.locale);
          loadDraft(validation.locale, workingDrafts);
          const language = activeLanguages.find((item) => item.code === validation.locale);
          void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
          return;
        }
      }

      setDrafts(workingDrafts);

      startTransition(async () => {
        let nextMethodId = methodId;
        const shared = {
          code: normalizedCode,
          enabled: sharedValues.enabled,
          sortOrder,
        };

        if (nextMethodId) {
          const patchResponse = await fetch(`/api/admin/shipping-methods/${nextMethodId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shared),
          });
          if (!patchResponse.ok) {
            const payload = await patchResponse.json().catch(() => ({}));
            void messageApi.error(payload.message ?? '物流方式基础信息保存失败');
            return;
          }
        }

        const nextDrafts = { ...workingDrafts };
        for (const { locale, draft } of targets) {
          const response = await fetch(
            draft.entryId
              ? `/api/admin/shipping-methods/translations/${draft.entryId}`
              : '/api/admin/shipping-methods',
            {
              method: draft.entryId ? 'PATCH' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(buildTranslationPayload(draft, locale, {
                shippingMethodId: nextMethodId,
                ...shared,
              })),
            },
          );

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const language = activeLanguages.find((item) => item.code === locale);
            void messageApi.error(payload.message ?? `${language?.nativeName ?? locale} 保存失败，请稍后重试`);
            return;
          }

          const saved = (await response.json()) as AdminShippingMethodTranslation;
          nextMethodId = saved.shippingMethodId;
          setMethodId(saved.shippingMethodId);
          nextDrafts[locale] = { ...entryToDraft(saved) };
          baselineDraftsRef.current[locale] = { ...nextDrafts[locale] };
        }

        setDrafts(nextDrafts);
        loadDraft(activeLocale, nextDrafts);
        void messageApi.success('保存成功');
        onSaved();
        onClose();
      });
    });
  }

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={editingEntry ? '编辑物流方式' : '新增物流方式'}
        onCancel={onClose}
        onOk={persistAllLocales}
        confirmLoading={isPending}
        width={760}
        destroyOnHidden
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Form form={sharedForm} layout="vertical">
            <Space align="start" style={{ width: '100%' }} size="large">
              <Form.Item
                label="编码"
                name="code"
                rules={[{ required: true, message: '请填写编码' }]}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Input placeholder="dhl-express" />
              </Form.Item>
              <Form.Item label="状态" name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Space>
          </Form>

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
              <Form form={form} layout="vertical" preserve={false}>
                <Tabs
                  defaultActiveKey="content"
                  tabBarExtraContent={(
                    <ContentTranslateButton
                      contentType="shippingMethod"
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
                        <>
                          <Form.Item
                            label="名称"
                            name="name"
                            rules={[{ required: true, message: '请输入名称' }]}
                          >
                            <Input placeholder="DHL Express" />
                          </Form.Item>
                          <Form.Item label="时效" name="etaLabel">
                            <Input placeholder="2-5 business days" />
                          </Form.Item>
                          <Form.Item label="说明" name="note">
                            <Input.TextArea rows={4} />
                          </Form.Item>
                        </>
                      ),
                    },
                  ]}
                />
              </Form>
            </div>
          </div>
        </Space>
      </Modal>
    </>
  );
}
