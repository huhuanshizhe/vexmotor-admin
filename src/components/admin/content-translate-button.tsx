'use client';

import { TranslationOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Spin, Tooltip, message } from 'antd';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import {
  CONTENT_TRANSLATE_PROFILES,
  filterNonemptyTranslateFields,
  pickTranslatePayload,
  validateDefaultTranslateSource,
  type ContentTranslateType,
} from '@/lib/content-translate-config';

type ContentTranslateButtonProps = {
  contentType: ContentTranslateType;
  defaultLocale: string;
  activeLocale: string;
  disabled?: boolean;
  getDefaultSourceFields: () => Record<string, string>;
  hasDefaultPersisted: () => boolean;
  hasTargetContent: () => boolean;
  onTranslated: (fields: Record<string, string>) => void;
};

export function ContentTranslateButton({
  contentType,
  defaultLocale,
  activeLocale,
  disabled = false,
  getDefaultSourceFields,
  hasDefaultPersisted,
  hasTargetContent,
  onTranslated,
}: ContentTranslateButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!defaultLocale || activeLocale === defaultLocale || disabled) {
    return null;
  }

  async function runTranslate() {
    if (!hasDefaultPersisted()) {
      void message.warning('请先在默认语言下保存内容，再进行翻译');
      return;
    }

    const sourceFields = getDefaultSourceFields();
    const validationMessage = validateDefaultTranslateSource(contentType, sourceFields);
    if (validationMessage) {
      void message.warning(validationMessage);
      return;
    }

    const payload = pickTranslatePayload(contentType, sourceFields);
    if (!Object.keys(payload).length) {
      void message.warning('默认语言暂无可翻译内容');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai/translate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          sourceLocale: defaultLocale,
          targetLocale: activeLocale,
          fields: payload,
        }),
      });

      const data = await response.json() as {
        fields?: Record<string, string>;
        code?: string;
        message?: string;
      };

      if (!response.ok) {
        if (data.code === 'HTML_STRUCTURE_MISMATCH') {
          void message.error(data.message ?? '正文格式未能完整保留，请手动校对或重新翻译');
        } else {
          void message.error('翻译服务暂不可用，请稍后重试');
        }
        return;
      }

      onTranslated(filterNonemptyTranslateFields(contentType, data.fields ?? {}));
      void message.success('已填入当前语言，版式继承默认语言，请校对后保存');
    } catch {
      void message.error('翻译服务暂不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  const willOverwrite = hasTargetContent();
  const tooltip = CONTENT_TRANSLATE_PROFILES[contentType].tooltip;

  return (
    <>
      {loading && typeof document !== 'undefined'
        ? createPortal(
            <div className="content-translate-overlay" aria-busy="true" aria-live="polite">
              <Spin size="large" tip="正在翻译并填充当前语言…" />
            </div>,
            document.body,
          )
        : null}
      <Tooltip title={tooltip}>
        <Popconfirm
          title={willOverwrite ? '覆盖当前语言内容？' : '从默认语言翻译？'}
          description={willOverwrite
            ? '将用默认语言的翻译结果替换当前表单，此操作不可撤销。'
            : '将根据默认语言已保存内容生成当前语言版本，填充后请校对。'}
          okText={willOverwrite ? '翻译并覆盖' : '开始翻译'}
          cancelText="取消"
          disabled={loading}
          onConfirm={() => void runTranslate()}
        >
          <Button icon={<TranslationOutlined />} loading={loading}>
            从默认语言翻译
          </Button>
        </Popconfirm>
      </Tooltip>
    </>
  );
}

export type { ContentTranslateType };
