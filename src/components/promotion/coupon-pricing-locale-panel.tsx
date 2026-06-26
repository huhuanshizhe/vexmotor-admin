'use client';

import { Form, InputNumber, Tabs } from 'antd';
import type { FormInstance } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import type { CouponDiscountType, CouponLocalePricing, CouponLocalePricingInput } from '@/lib/coupon-list-query';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

const COUPON_NUMERIC_INPUT_STYLE = { width: '100%' } as const;
const EMPTY_LOCALE_PRICING: CouponLocalePricing[] = [];

type LocalePricingFormValues = {
  thresholdAmount?: number | null;
  discountValue?: number | null;
  maxDiscountAmount?: number | null;
};

type LocalePricingDraft = LocalePricingFormValues & {
  persisted: boolean;
};

export type CouponPricingLocalePanelRef = {
  mergeActiveLocale: () => void;
  buildLocalePricing: () => CouponLocalePricingInput[];
  validate: () => { ok: boolean; message?: string };
};

type CouponPricingLocalePanelProps = {
  activeLanguages: AdminSiteLanguageRow[];
  discountType: CouponDiscountType;
  initialLocalePricing?: CouponLocalePricing[];
};

function createEmptyDraft(): LocalePricingDraft {
  return {
    thresholdAmount: null,
    discountValue: null,
    maxDiscountAmount: null,
    persisted: false,
  };
}

function pricingToDraft(row: CouponLocalePricing): LocalePricingDraft {
  return {
    thresholdAmount: row.thresholdAmount != null ? Number(row.thresholdAmount) : null,
    discountValue: row.discountValue != null ? Number(row.discountValue) : null,
    maxDiscountAmount: row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
    persisted: true,
  };
}

function mergeActiveFormIntoDrafts(
  drafts: Record<string, LocalePricingDraft>,
  activeLocale: string,
  form: FormInstance<LocalePricingFormValues>,
): Record<string, LocalePricingDraft> {
  if (!activeLocale) return drafts;
  const previous = drafts[activeLocale] ?? createEmptyDraft();
  const values = form.getFieldsValue(true);
  const hasValue = values.discountValue != null && values.discountValue > 0;
  return {
    ...drafts,
    [activeLocale]: {
      ...previous,
      ...values,
      persisted: previous.persisted || hasValue,
    },
  };
}

function buildDraftsFromPricing(
  languages: AdminSiteLanguageRow[],
  pricingRows: CouponLocalePricing[],
): Record<string, LocalePricingDraft> {
  const nextDrafts: Record<string, LocalePricingDraft> = {};
  for (const language of languages) {
    const existing = pricingRows.find((row) => row.locale === language.code);
    nextDrafts[language.code] = existing ? pricingToDraft(existing) : createEmptyDraft();
  }
  return nextDrafts;
}

function getDiscountValueLabel(discountType: CouponDiscountType) {
  if (discountType === 'special_price') return '优惠价';
  return '优惠幅度';
}

export const CouponPricingLocalePanel = forwardRef<CouponPricingLocalePanelRef, CouponPricingLocalePanelProps>(
  function CouponPricingLocalePanel({
    activeLanguages,
    discountType,
    initialLocalePricing,
  }, ref) {
    const pricingRows = initialLocalePricing ?? EMPTY_LOCALE_PRICING;

    const enabledLanguages = useMemo(
      () => activeLanguages.filter((language) => language.status === 'active'),
      [activeLanguages],
    );

    const enabledLanguageKey = useMemo(
      () => enabledLanguages.map((language) => language.code).join(','),
      [enabledLanguages],
    );

    const initialPricingKey = useMemo(
      () => JSON.stringify(pricingRows),
      [pricingRows],
    );

    const [activeLocale, setActiveLocale] = useState('');
    const [drafts, setDrafts] = useState<Record<string, LocalePricingDraft>>({});
    const [pricingForm] = Form.useForm<LocalePricingFormValues>();
    const lastInitKeyRef = useRef('');

    const activeLanguage = enabledLanguages.find((language) => language.code === activeLocale);
    const currencyCode = activeLanguage?.currencyCode ?? 'USD';

    useEffect(() => {
      if (!enabledLanguages.length) {
        setActiveLocale('');
        return;
      }
      setActiveLocale((current) => (
        current && enabledLanguages.some((language) => language.code === current)
          ? current
          : enabledLanguages[0]!.code
      ));
    }, [enabledLanguages]);

    useEffect(() => {
      const initKey = `${enabledLanguageKey}|${initialPricingKey}`;
      if (lastInitKeyRef.current === initKey) return;
      lastInitKeyRef.current = initKey;
      setDrafts(buildDraftsFromPricing(enabledLanguages, pricingRows));
    }, [enabledLanguageKey, enabledLanguages, initialPricingKey, pricingRows]);

    useEffect(() => {
      if (!activeLocale) return;
      const draft = drafts[activeLocale] ?? createEmptyDraft();
      pricingForm.setFieldsValue({
        thresholdAmount: draft.thresholdAmount,
        discountValue: draft.discountValue,
        maxDiscountAmount: draft.maxDiscountAmount,
      });
    }, [activeLocale, drafts, pricingForm, discountType]);

    function handleLocaleChange(nextLocale: string) {
      if (nextLocale === activeLocale) return;
      setDrafts((current) => mergeActiveFormIntoDrafts(current, activeLocale, pricingForm));
      setActiveLocale(nextLocale);
    }

    useImperativeHandle(ref, () => ({
      mergeActiveLocale() {
        setDrafts((current) => mergeActiveFormIntoDrafts(current, activeLocale, pricingForm));
      },
      buildLocalePricing(): CouponLocalePricingInput[] {
        const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, pricingForm);
        const items: CouponLocalePricingInput[] = [];
        for (const language of enabledLanguages) {
          const draft = merged[language.code];
          if (!draft?.discountValue || draft.discountValue <= 0) continue;
          items.push({
            locale: language.code,
            thresholdAmount: discountType === 'fixed_amount' ? (draft.thresholdAmount ?? 0) : null,
            discountValue: draft.discountValue,
            maxDiscountAmount: discountType === 'percent' ? (draft.maxDiscountAmount ?? null) : null,
          });
        }
        return items;
      },
      validate() {
        const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, pricingForm);
        const items = enabledLanguages
          .map((language) => merged[language.code])
          .filter((draft) => draft?.discountValue && draft.discountValue > 0);

        if (!items.length) {
          return { ok: false, message: '请至少为一个语言填写优惠幅度' };
        }

        for (const draft of items) {
          if (discountType === 'fixed_amount' && draft.thresholdAmount === undefined) {
            return { ok: false, message: '满减券需填写优惠门槛' };
          }
          if (discountType === 'percent' && draft.discountValue != null && (draft.discountValue <= 0 || draft.discountValue > 100)) {
            return { ok: false, message: '折扣幅度需在 0-100 之间' };
          }
        }

        return { ok: true };
      },
    }), [activeLocale, discountType, drafts, enabledLanguages, pricingForm]);

    const pricingTab = (
      <div className="coupon-pricing-locale-panel__fields">
        <Form form={pricingForm} layout="vertical" preserve={false}>
          {discountType === 'fixed_amount' ? (
            <Form.Item
              label="优惠门槛"
              name="thresholdAmount"
              rules={[{ required: true, message: '请填写门槛' }]}
              extra="填 0 表示无门槛"
            >
              <InputNumber
                min={0}
                precision={2}
                style={COUPON_NUMERIC_INPUT_STYLE}
                addonAfter={currencyCode}
              />
            </Form.Item>
          ) : null}

          <Form.Item
            label={getDiscountValueLabel(discountType)}
            name="discountValue"
            rules={[{ required: true, message: `请填写${getDiscountValueLabel(discountType)}` }]}
          >
            <InputNumber
              min={0.01}
              max={discountType === 'percent' ? 100 : undefined}
              precision={discountType === 'percent' ? 4 : 2}
              style={COUPON_NUMERIC_INPUT_STYLE}
              addonAfter={discountType === 'percent' ? '%' : currencyCode}
            />
          </Form.Item>

          {discountType === 'percent' ? (
            <Form.Item label="最多抵扣" name="maxDiscountAmount">
              <InputNumber
                min={0}
                precision={2}
                style={COUPON_NUMERIC_INPUT_STYLE}
                addonAfter={currencyCode}
              />
            </Form.Item>
          ) : null}
        </Form>
      </div>
    );

    if (!enabledLanguages.length) {
      return null;
    }

    return (
      <div className="coupon-editor-modal__pricing-section">
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {enabledLanguages.map((language) => (
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
            <Tabs
              items={[
                { key: 'pricing', label: '优惠幅度', children: pricingTab },
              ]}
            />
          </div>
        </div>
      </div>
    );
  },
);
