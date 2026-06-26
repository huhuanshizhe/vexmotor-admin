'use client';

import { Divider, Form, Input, InputNumber, Modal, Select, Switch, Tabs, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminDateTimePicker } from '@/components/admin/admin-datetime-picker';
import { BrandPickerField } from '@/components/brands/brand-picker-field';
import { CategoryPickerField } from '@/components/categories/category-picker-field';
import { ProductPickerField } from '@/components/products/product-picker-field';
import {
  CouponPricingLocalePanel,
  type CouponPricingLocalePanelRef,
} from '@/components/promotion/coupon-pricing-locale-panel';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { AdminCouponDetail } from '@/lib/coupon-list-query';
import {
  couponDiscountTypeOptions,
  couponScopeOptions,
} from '@/lib/admin-display';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type CouponEditorModalProps = {
  open: boolean;
  editing: AdminCouponDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  categoryTree: AdminCategoryTreeNode[];
  onClose: () => void;
  onSaved: () => void;
};

type CouponFormValues = {
  name: string;
  couponKey?: string;
  scope: AdminCouponDetail['scope'];
  stackable: boolean;
  discountType: AdminCouponDetail['discountType'];
  startsAt?: Dayjs | null;
  endsAt?: Dayjs | null;
  status: AdminCouponDetail['status'];
  note?: string;
  totalQuota?: number | null;
  perUserLimit?: number | null;
  grantOnRegister: boolean;
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
};

export type CouponSectionTabKey = 'content' | 'effective' | 'limits';

const COUPON_NUMERIC_INPUT_STYLE = { width: '100%' } as const;

const EFFECTIVE_FIELDS = new Set(['status', 'startsAt', 'endsAt']);
const LIMITS_FIELDS = new Set(['stackable', 'totalQuota', 'perUserLimit', 'grantOnRegister']);

function resolveCouponSectionTab(fieldName: string | number | (string | number)[]): CouponSectionTabKey {
  const name = Array.isArray(fieldName) ? String(fieldName[0]) : String(fieldName);
  if (EFFECTIVE_FIELDS.has(name)) return 'effective';
  if (LIMITS_FIELDS.has(name)) return 'limits';
  return 'content';
}

export function CouponEditorModal({
  open,
  editing,
  activeLanguages,
  categoryTree,
  onClose,
  onSaved,
}: CouponEditorModalProps) {
  const [form] = Form.useForm<CouponFormValues>();
  const [sectionTab, setSectionTab] = useState<CouponSectionTabKey>('content');
  const pricingPanelRef = useRef<CouponPricingLocalePanelRef>(null);
  const scope = Form.useWatch('scope', form);
  const discountType = Form.useWatch('discountType', form);

  const discountTypeOptions = useMemo(() => {
    if (scope === 'product') return couponDiscountTypeOptions;
    return couponDiscountTypeOptions.filter((option) => option.value !== 'special_price');
  }, [scope]);

  useEffect(() => {
    if (!open) return;

    setSectionTab('content');

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        couponKey: editing.couponKey,
        scope: editing.scope,
        stackable: editing.stackable,
        discountType: editing.discountType,
        startsAt: editing.startsAt ? dayjs(editing.startsAt) : null,
        endsAt: editing.endsAt ? dayjs(editing.endsAt) : null,
        status: editing.status,
        note: editing.note ?? '',
        totalQuota: editing.totalQuota,
        perUserLimit: editing.perUserLimit,
        grantOnRegister: editing.grantOnRegister,
        categoryIds: editing.categoryIds,
        brandIds: editing.brandIds,
        productIds: editing.productIds,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        scope: 'all',
        stackable: false,
        discountType: 'percent',
        status: 'inactive',
        grantOnRegister: false,
        categoryIds: [],
        brandIds: [],
        productIds: [],
      });
    }

  }, [open, editing, form]);

  useEffect(() => {
    if (scope !== 'product' && discountType === 'special_price') {
      form.setFieldValue('discountType', 'percent');
    }
  }, [scope, discountType, form]);

  async function handleSubmit() {
    let values: CouponFormValues;
    try {
      values = await form.validateFields();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        const fieldError = error as { errorFields: Array<{ name: string | number | (string | number)[] }> };
        const firstField = fieldError.errorFields[0]?.name;
        if (firstField) {
          setSectionTab(resolveCouponSectionTab(firstField));
        }
      }
      throw error;
    }

    pricingPanelRef.current?.mergeActiveLocale();
    const pricingValidation = pricingPanelRef.current?.validate();
    if (pricingValidation && !pricingValidation.ok) {
      void message.error(pricingValidation.message ?? '请完善多语言优惠幅度');
      return;
    }

    const localePricing = pricingPanelRef.current?.buildLocalePricing() ?? [];
    if (!localePricing.length) {
      void message.error('请至少为一个语言填写优惠幅度');
      return;
    }

    const payload = {
      name: values.name,
      couponKey: values.couponKey?.trim() || undefined,
      scope: values.scope,
      stackable: values.stackable,
      discountType: values.discountType,
      localePricing,
      startsAt: values.startsAt ? values.startsAt.toISOString() : null,
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
      status: values.status,
      note: values.note?.trim() || null,
      totalQuota: values.totalQuota ?? null,
      perUserLimit: values.perUserLimit ?? null,
      grantOnRegister: values.grantOnRegister,
      categoryIds: values.scope === 'category' ? values.categoryIds : [],
      brandIds: values.scope === 'brand' ? values.brandIds : [],
      productIds: values.scope === 'product' ? values.productIds : [],
    };

    const response = await fetch(editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorPayload?.error ?? '保存失败');
    }

    onSaved();
    onClose();
  }

  const contentTab = (
    <>
      <Form.Item label="优惠券名称" name="name" rules={[{ required: true, message: '请填写名称' }]}>
        <Input placeholder="例如 新客满减券" />
      </Form.Item>
      <Form.Item label="Key" name="couponKey" extra="留空将自动生成唯一 Key">
        <Input placeholder="例如 CPN-1719300000123-A3F7K2" />
      </Form.Item>
      <Form.Item label="适用范围" name="scope" rules={[{ required: true }]}>
        <Select options={couponScopeOptions} />
      </Form.Item>

      {scope === 'category' ? (
        <Form.Item
          label="指定分类"
          name="categoryIds"
          rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个分类' }]}
        >
          <CategoryPickerField mode="multiple" categoryTree={categoryTree} />
        </Form.Item>
      ) : null}

      {scope === 'brand' ? (
        <Form.Item
          label="指定品牌"
          name="brandIds"
          rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个品牌' }]}
        >
          <BrandPickerField mode="multiple" />
        </Form.Item>
      ) : null}

      {scope === 'product' ? (
        <Form.Item
          label="指定商品"
          name="productIds"
          rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个商品' }]}
        >
          <ProductPickerField mode="multiple" categoryTree={categoryTree} />
        </Form.Item>
      ) : null}

      <Form.Item label="优惠类型" name="discountType" rules={[{ required: true }]}>
        <Select options={discountTypeOptions} />
      </Form.Item>

      <Form.Item label="备注" name="note">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );

  const effectiveTab = (
    <>
      <Form.Item
        label="启用"
        name="status"
        getValueProps={(value) => ({ checked: value === 'active' })}
        getValueFromEvent={(checked: boolean) => (checked ? 'active' : 'inactive')}
      >
        <Switch />
      </Form.Item>
      <Form.Item label="优惠开始时间" name="startsAt">
        <AdminDateTimePicker mode="datetime" />
      </Form.Item>
      <Form.Item label="优惠结束时间" name="endsAt">
        <AdminDateTimePicker mode="datetime" />
      </Form.Item>
    </>
  );

  const limitsTab = (
    <>
      <Form.Item label="可与其他优惠券叠加" name="stackable" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item
        label="总张数"
        name="totalQuota"
        extra={editing ? `已发放 ${editing.issuedQuantity} 张` : '留空表示不限'}
      >
        <InputNumber
          min={1}
          precision={0}
          style={COUPON_NUMERIC_INPUT_STYLE}
          placeholder="不限"
          addonAfter="张"
        />
      </Form.Item>
      <Form.Item label="每客户限领" name="perUserLimit" extra="留空表示不限">
        <InputNumber
          min={1}
          precision={0}
          style={COUPON_NUMERIC_INPUT_STYLE}
          placeholder="不限"
          addonAfter="张"
        />
      </Form.Item>
      <Form.Item
        label="新用户注册赠送"
        name="grantOnRegister"
        valuePropName="checked"
        extra="开启后，客户在前台注册成功时自动获得 1 张（受总张数与每人限领约束）"
      >
        <Switch />
      </Form.Item>
    </>
  );

  return (
    <Modal
      open={open}
      title={editing ? '编辑优惠券' : '新增优惠券'}
      width={900}
      className="coupon-editor-modal"
      onCancel={onClose}
      onOk={() => {
        void handleSubmit().catch((error: unknown) => {
          if (error && typeof error === 'object' && 'errorFields' in error) return;
          const errorMessage = error instanceof Error ? error.message : '保存失败';
          Modal.error({ title: '保存失败', content: errorMessage });
        });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Tabs
          activeKey={sectionTab}
          onChange={(key) => setSectionTab(key as CouponSectionTabKey)}
          items={[
            { key: 'content', label: '内容', children: contentTab },
            { key: 'effective', label: '生效', children: effectiveTab },
            { key: 'limits', label: '使用限制', children: limitsTab },
          ]}
        />

        <Divider className="coupon-editor-modal__section-divider" />

        <CouponPricingLocalePanel
          key={editing?.id ?? 'new'}
          ref={pricingPanelRef}
          activeLanguages={activeLanguages}
          discountType={discountType ?? 'percent'}
          initialLocalePricing={editing?.localePricing}
        />
      </Form>
    </Modal>
  );
}
