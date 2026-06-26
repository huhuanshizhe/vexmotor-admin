'use client';

import { Button, Form, InputNumber, Space, Switch, Typography, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ProductFeatureTextValueCombobox } from '@/components/products/product-feature-text-value-combobox';
import type { FeatureValueType } from '@/lib/feature-definition-content';
import type { AdminProductFeatureValueDetail } from '@/lib/product-feature-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleFormValues = {
  valueText: string;
  valueNumber: number | null;
  valueBoolean: boolean;
};

type ProductFeatureValueLocalePanelProps = {
  productId: string;
  assignmentId: string;
  valueId: string;
  detail: AdminProductFeatureValueDetail;
  activeLanguages: AdminSiteLanguageRow[];
  onSaved: (detail: AdminProductFeatureValueDetail) => void;
  onCloseAfterSave?: () => void;
};

function createEmptyDraft(): LocaleFormValues {
  return {
    valueText: '',
    valueNumber: null,
    valueBoolean: false,
  };
}

function translationToDraft(
  detail: AdminProductFeatureValueDetail,
  locale: string,
): LocaleFormValues {
  const translation = detail.translations.find((item) => item.locale === locale);
  if (!translation) return createEmptyDraft();
  return {
    valueText: translation.valueText ?? '',
    valueNumber: translation.valueNumber == null || translation.valueNumber === ''
      ? null
      : Number(translation.valueNumber),
    valueBoolean: translation.valueBoolean ?? false,
  };
}

export function ProductFeatureValueLocalePanel({
  productId,
  assignmentId,
  valueId,
  detail,
  activeLanguages,
  onSaved,
  onCloseAfterSave,
}: ProductFeatureValueLocalePanelProps) {
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? '');
  const [drafts, setDrafts] = useState<Record<string, LocaleFormValues>>({});
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();

  useEffect(() => {
    const defaultLocale = activeLanguages[0]?.code ?? '';
    setActiveLocale(defaultLocale);
    const nextDrafts = Object.fromEntries(
      activeLanguages.map((language) => [language.code, translationToDraft(detail, language.code)]),
    );
    setDrafts(nextDrafts);
    form.setFieldsValue(nextDrafts[defaultLocale] ?? createEmptyDraft());
  }, [detail, activeLanguages, form]);

  function mergeActiveDraft() {
    if (!activeLocale) return drafts;
    const values = form.getFieldsValue(true);
    return {
      ...drafts,
      [activeLocale]: {
        valueText: values.valueText ?? '',
        valueNumber: values.valueNumber ?? null,
        valueBoolean: values.valueBoolean ?? false,
      },
    };
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveDraft();
    setDrafts(merged);
    setActiveLocale(nextLocale);
    form.setFieldsValue(merged[nextLocale] ?? createEmptyDraft());
  }

  function persistTranslations() {
    const merged = mergeActiveDraft();
    const targets = activeLanguages
      .map((language) => ({ locale: language.code, draft: merged[language.code] ?? createEmptyDraft() }))
      .filter((target) => {
        if (detail.valueType === 'number') return target.draft.valueNumber != null;
        if (detail.valueType === 'boolean') return true;
        return Boolean(target.draft.valueText.trim());
      });

    if (!targets.length) {
      void messageApi.warning('请至少填写一个语言版本的特性值');
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/admin/products/${productId}/feature-assignments/${assignmentId}/values/${valueId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            translations: targets.map(({ locale, draft }) => ({
              locale,
              valueText: detail.valueType === 'text' ? draft.valueText.trim() : null,
              valueNumber: detail.valueType === 'number' ? draft.valueNumber : null,
              valueBoolean: detail.valueType === 'boolean' ? draft.valueBoolean : null,
            })),
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        void messageApi.error(payload?.message ?? '保存失败');
        return;
      }

      const saved = (await response.json()) as AdminProductFeatureValueDetail;
      const nextDrafts = Object.fromEntries(
        activeLanguages.map((language) => [language.code, translationToDraft(saved, language.code)]),
      );
      setDrafts(nextDrafts);
      form.setFieldsValue(nextDrafts[activeLocale] ?? createEmptyDraft());
      void messageApi.success('保存成功');
      onSaved(saved);
      onCloseAfterSave?.();
    });
  }

  function renderValueField(valueType: FeatureValueType, locale: string) {
    if (valueType === 'number') {
      const unit = detail.unitByLocale[locale] ?? detail.unitByLocale.en ?? null;
      return (
        <>
          <Form.Item label="数值" name="valueNumber" rules={[{ required: true, message: '请填写数值' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Typography.Text type="secondary">
            值单位（只读）：{unit?.trim() ? unit : '—'}
          </Typography.Text>
        </>
      );
    }
    if (valueType === 'boolean') {
      return (
        <Form.Item label="是/否" name="valueBoolean" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      );
    }
    return (
      <Form.Item label="文本值" name="valueText" rules={[{ required: true, message: '请填写文本值' }]}>
        <ProductFeatureTextValueCombobox options={detail.textOptionsByLocale[locale] ?? []} />
      </Form.Item>
    );
  }

  if (!activeLanguages.length) {
    return <Typography.Text type="secondary">尚未配置站点语言</Typography.Text>;
  }

  return (
    <>
      {contextHolder}
      <div className="product-feature-value-locale-panel">
        <div className="product-feature-value-locale-panel__toolbar">
          <Typography.Text strong>编辑特性值 · {detail.definitionName}</Typography.Text>
          <Button type="primary" loading={isPending} onClick={() => persistTranslations()}>
            保存值
          </Button>
        </div>
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={language.code === activeLocale}
                persisted={Boolean(detail.translations.find((item) => item.locale === language.code))}
                onClick={() => handleLocaleChange(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <Form<LocaleFormValues> form={form} layout="vertical" preserve>
              <div className="feature-definition-editor-content">
                <div className="feature-definition-editor-content__title">内容</div>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  {renderValueField(detail.valueType, activeLocale)}
                </Space>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
