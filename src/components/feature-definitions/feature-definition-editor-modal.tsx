'use client';

import { Button, Col, Empty, Form, Input, Modal, Row, Select, Space, Switch, Tabs, message } from 'antd';
import type { FormInstance } from 'antd';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { FeatureUnitCombobox } from '@/components/feature-definitions/feature-unit-combobox';
import { FeatureValueFields } from '@/components/feature-definitions/feature-value-fields';
import {
  type AdminFeatureDefinitionListItem,
  type AdminFeatureDefinitionTranslation,
  type FeatureDefinitionStatus,
  type FeatureSpecCategory,
  type FeatureValueType,
  featureSpecCategories,
  featureSpecCategoryLabels,
  featureValueTypes,
  featureValueTypeLabels,
  isUnitRequiredForValueType,
  resolveFeatureDefinitionId,
} from '@/lib/feature-definition-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleFormValues = {
  name: string;
  valueText: string;
  valueMin: number | null;
  valueMax: number | null;
  unit: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type FeatureDefinitionEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  editingEntry: AdminFeatureDefinitionListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminFeatureDefinitionTranslation) => void;
};

function createEmptyDraft(): LocaleDraft {
  return {
    name: '',
    valueText: '',
    valueMin: null,
    valueMax: null,
    unit: '',
    persisted: false,
  };
}

function entryToDraft(entry: AdminFeatureDefinitionTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    name: entry.name,
    valueText: entry.valueText ?? (entry.valueType === 'boolean' ? 'false' : ''),
    valueMin: entry.valueMin,
    valueMax: entry.valueMax,
    unit: entry.unit ?? '',
    persisted: true,
  };
}

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
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
      valueText: values.valueText ?? '',
      valueMin: values.valueMin ?? null,
      valueMax: values.valueMax ?? null,
      unit: values.unit ?? '',
    },
  };
}

function shouldPersistDraft(draft: LocaleDraft, valueType: FeatureValueType) {
  if (draft.persisted) return true;
  if (draft.name.trim()) return true;
  if (valueType === 'number') return draft.valueMin != null;
  if (valueType === 'range') return draft.valueMin != null || draft.valueMax != null;
  if (valueType === 'boolean') return draft.valueText === 'true' || draft.valueText === 'false';
  return Boolean(draft.valueText.trim() || draft.unit.trim());
}

export function FeatureDefinitionEditorModal({
  open,
  activeLanguages,
  editingEntry,
  onClose,
  onSaved,
}: FeatureDefinitionEditorModalProps) {
  const [definitionId, setDefinitionId] = useState<string | undefined>();
  const [specCategory, setSpecCategory] = useState<FeatureSpecCategory>('general');
  const [valueType, setValueType] = useState<FeatureValueType>('text');
  const [selectOptionsText, setSelectOptionsText] = useState('');
  const [status, setStatus] = useState<FeatureDefinitionStatus>('active');
  const [activeLocale, setActiveLocale] = useState('');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();

  const hasLanguages = activeLanguages.length > 0;
  const isEditing = Boolean(editingEntry);
  const selectOptions = splitMultiline(selectOptionsText);

  useEffect(() => {
    if (!open) return;

    if (!activeLanguages.length) {
      setDefinitionId(undefined);
      setActiveLocale('');
      setDrafts({});
      form.resetFields();
      return;
    }

    const defaultLocale = activeLanguages[0]?.code ?? '';
    setActiveLocale(defaultLocale);

    if (!editingEntry) {
      setDefinitionId(undefined);
      setSpecCategory('general');
      setValueType('text');
      setSelectOptionsText('');
      setStatus('active');
      const emptyDrafts = Object.fromEntries(activeLanguages.map((language) => [language.code, createEmptyDraft()]));
      setDrafts(emptyDrafts);
      form.setFieldsValue(createEmptyDraft());
      return;
    }

    setDefinitionId(editingEntry.id);
    setSpecCategory(editingEntry.specCategory);
    setValueType(editingEntry.valueType);
    setSelectOptionsText((editingEntry.selectOptions ?? []).join('\n'));
    setStatus(editingEntry.status);
    setLoadingGroup(true);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/feature-definitions/${editingEntry.id}`);
        if (!response.ok) throw new Error('load failed');
        const payload = (await response.json()) as {
          item: AdminFeatureDefinitionListItem;
          translations: AdminFeatureDefinitionTranslation[];
        };

        const nextDrafts = Object.fromEntries(
          activeLanguages.map((language) => {
            const translation = payload.translations.find((item) => item.locale === language.code);
            return [language.code, translation ? entryToDraft(translation) : createEmptyDraft()];
          }),
        );
        setDrafts(nextDrafts);
        const locale = defaultLocale;
        form.setFieldsValue(nextDrafts[locale] ?? createEmptyDraft());
      } catch {
        void messageApi.error('加载特性详情失败');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, form, messageApi]);

  function loadDraft(locale: string, source: Record<string, LocaleDraft>) {
    const draft = source[locale] ?? createEmptyDraft();
    form.setFieldsValue({
      name: draft.name,
      valueText: draft.valueText,
      valueMin: draft.valueMin,
      valueMax: draft.valueMax,
      unit: draft.unit,
    });
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    loadDraft(nextLocale, merged);
  }

  function validateDraft(locale: string, draft: LocaleDraft) {
    if (!draft.name.trim()) {
      return { ok: false as const, locale, message: '请填写特性名称' };
    }
    if (valueType === 'select' && !selectOptions.length) {
      return { ok: false as const, locale, message: '下拉类型必须配置选项列表' };
    }
    if (valueType === 'text' && !draft.valueText.trim()) {
      return { ok: false as const, locale, message: '请填写特性值' };
    }
    if (valueType === 'select' && !draft.valueText.trim()) {
      return { ok: false as const, locale, message: '请选择特性值' };
    }
    if (valueType === 'number' && draft.valueMin == null) {
      return { ok: false as const, locale, message: '请填写数值' };
    }
    if (valueType === 'range' && (draft.valueMin == null || draft.valueMax == null)) {
      return { ok: false as const, locale, message: '请填写完整范围' };
    }
    if (valueType === 'range' && draft.valueMin != null && draft.valueMax != null && draft.valueMin > draft.valueMax) {
      return { ok: false as const, locale, message: '范围最小值不能大于最大值' };
    }
    if (isUnitRequiredForValueType(valueType) && !draft.unit.trim()) {
      return { ok: false as const, locale, message: '请填写值单位' };
    }
    return { ok: true as const };
  }

  function buildTranslationPayload(draft: LocaleDraft, locale: string) {
    return {
      definitionId,
      locale,
      specCategory,
      name: draft.name.trim(),
      valueType,
      selectOptions,
      status,
      valueText: valueType === 'boolean' ? (draft.valueText === 'true' ? 'true' : 'false') : draft.valueText || null,
      valueMin: draft.valueMin,
      valueMax: draft.valueMax,
      unit: draft.unit.trim() || null,
    };
  }

  function persistAllLocales(closeAfterSave = false) {
    if (!hasLanguages) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
      return;
    }

    const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    const targets = activeLanguages
      .map((language) => ({ locale: language.code, draft: mergedDrafts[language.code] ?? createEmptyDraft() }))
      .filter((target) => shouldPersistDraft(target.draft, valueType));

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
      let nextDefinitionId = definitionId;
      const nextDrafts = { ...mergedDrafts };
      const savedEntries: AdminFeatureDefinitionTranslation[] = [];
      const shared = {
        specCategory,
        valueType,
        selectOptions,
        status,
      };

      if (nextDefinitionId) {
        const patchResponse = await fetch(`/api/admin/feature-definitions/${nextDefinitionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          const payload = await patchResponse.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? '特性基础信息保存失败');
          return;
        }
      }

      for (const { locale, draft } of targets) {
        const response = await fetch(
          draft.entryId
            ? `/api/admin/feature-definitions/translations/${draft.entryId}`
            : '/api/admin/feature-definitions',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationPayload(draft, locale)),
          },
        );

        if (!response.ok) {
          const language = activeLanguages.find((item) => item.code === locale);
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? `${language?.nativeName ?? locale} 保存失败，请稍后重试`);
          if (savedEntries.length > 0) {
            for (const saved of savedEntries) onSaved(saved);
          }
          return;
        }

        const saved = (await response.json()) as AdminFeatureDefinitionTranslation;
        nextDefinitionId = resolveFeatureDefinitionId(saved);
        nextDrafts[locale] = {
          ...draft,
          entryId: saved.id,
          persisted: true,
        };
        savedEntries.push(saved);
      }

      setDrafts(nextDrafts);
      setDefinitionId(nextDefinitionId);
      loadDraft(activeLocale, nextDrafts);
      for (const saved of savedEntries) onSaved(saved);
      void messageApi.success(`已保存 ${savedEntries.length} 个语言版本`);
      if (closeAfterSave) onClose();
    });
  }

  const sharedFieldsPanel = (
    <div className="content-editor-shared-section">
      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="特性分类" layout="vertical" required style={{ marginBottom: 16 }}>
            <Select
              value={specCategory}
              onChange={setSpecCategory}
              options={featureSpecCategories.map((value) => ({
                value,
                label: featureSpecCategoryLabels[value],
              }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="值类型" layout="vertical" required style={{ marginBottom: 16 }}>
            <Select
              value={valueType}
              onChange={setValueType}
              options={featureValueTypes.map((value) => ({
                value,
                label: featureValueTypeLabels[value],
              }))}
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
        {valueType === 'select' ? (
          <Col span={24}>
            <Form.Item label="下拉选项" layout="vertical" required extra="每行一个选项" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={4}
                value={selectOptionsText}
                onChange={(event) => setSelectOptionsText(event.target.value)}
                placeholder="选项 A&#10;选项 B"
              />
            </Form.Item>
          </Col>
        ) : null}
      </Row>
    </div>
  );

  return (
    <>
      {contextHolder}
      <Modal
        title={isEditing ? `编辑特性 · ${editingEntry?.name ?? ''}` : '新建特性'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        destroyOnHidden
        confirmLoading={isPending || loadingGroup}
        className="content-editor-modal feature-definition-editor-modal"
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
                  {isEditing ? '保存' : '保存特性'}
                </Button>
                <Button type="primary" loading={isPending} onClick={() => persistAllLocales(true)}>
                  保存并关闭
                </Button>
              </Space>
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
                    items={[
                      {
                        key: 'content',
                        label: '内容',
                        children: (
                          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Form.Item
                              label="特性名称"
                              name="name"
                              rules={[{ required: true, message: '请填写特性名称' }]}
                            >
                              <Input placeholder="如 Torque / 扭矩" />
                            </Form.Item>
                            <FeatureValueFields form={form} valueType={valueType} selectOptions={selectOptions} />
                            <Form.Item
                              label="值单位"
                              name="unit"
                              required={isUnitRequiredForValueType(valueType)}
                            >
                              <FeatureUnitCombobox
                                locale={activeLocale}
                                valueType={valueType}
                              />
                            </Form.Item>
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
