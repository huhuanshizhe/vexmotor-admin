'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import { EntityMultiPicker } from '@/components/promotion/entity-multi-picker';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { AdminCouponDetail } from '@/lib/coupon-list-query';
import {
  couponDiscountTypeOptions,
  couponScopeOptions,
} from '@/lib/admin-display';

type CouponEditorModalProps = {
  open: boolean;
  editing: AdminCouponDetail | null;
  defaultCurrencyCode: string;
  categoryTree: AdminCategoryTreeNode[];
  brandOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSaved: () => void;
};

type CouponFormValues = {
  name: string;
  couponKey?: string;
  scope: AdminCouponDetail['scope'];
  stackable: boolean;
  discountType: AdminCouponDetail['discountType'];
  thresholdAmount?: number | null;
  discountValue: number;
  maxDiscountAmount?: number | null;
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

function flattenCategoryTree(nodes: AdminCategoryTreeNode[]): Array<{ value: string; label: string }> {
  return nodes.flatMap((node) => [
    { value: node.id, label: node.name },
    ...flattenCategoryTree(node.children),
  ]);
}

export function CouponEditorModal({
  open,
  editing,
  defaultCurrencyCode,
  categoryTree,
  brandOptions,
  onClose,
  onSaved,
}: CouponEditorModalProps) {
  const [form] = Form.useForm<CouponFormValues>();
  const scope = Form.useWatch('scope', form);
  const discountType = Form.useWatch('discountType', form);

  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

  const [productOptions, setProductOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [productLoading, setProductLoading] = useState(false);

  async function searchProducts(keyword: string) {
    setProductLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '20' });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { items: Array<{ id: string; name: string; spu: string }> };
      setProductOptions((payload.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.name} (${item.spu})`,
      })));
    } finally {
      setProductLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        couponKey: editing.couponKey,
        scope: editing.scope,
        stackable: editing.stackable,
        discountType: editing.discountType,
        thresholdAmount: editing.thresholdAmount != null ? Number(editing.thresholdAmount) : null,
        discountValue: Number(editing.discountValue),
        maxDiscountAmount: editing.maxDiscountAmount != null ? Number(editing.maxDiscountAmount) : null,
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

    void searchProducts('');
  }, [open, editing, form]);

  useEffect(() => {
    if (scope !== 'product' && discountType === 'special_price') {
      form.setFieldValue('discountType', 'percent');
    }
  }, [scope, discountType, form]);

  const discountTypeOptions = useMemo(() => {
    if (scope === 'product') return couponDiscountTypeOptions;
    return couponDiscountTypeOptions.filter((option) => option.value !== 'special_price');
  }, [scope]);

  async function handleSubmit() {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      couponKey: values.couponKey?.trim() || undefined,
      scope: values.scope,
      stackable: values.stackable,
      discountType: values.discountType,
      thresholdAmount: values.discountType === 'fixed_amount' ? (values.thresholdAmount ?? 0) : null,
      discountValue: values.discountValue,
      maxDiscountAmount: values.discountType === 'percent' ? (values.maxDiscountAmount ?? null) : null,
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

  return (
    <Modal
      open={open}
      title={editing ? '编辑优惠券' : '新增优惠券'}
      width={760}
      onCancel={onClose}
      onOk={() => {
        void handleSubmit().catch((error: Error) => {
          Modal.error({ title: '保存失败', content: error.message });
        });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
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
          <Form.Item name="categoryIds" rules={[{ required: true, message: '请选择至少一个分类' }]}>
            <EntityMultiPicker label="指定分类" placeholder="搜索分类" options={categoryOptions} />
          </Form.Item>
        ) : null}

        {scope === 'brand' ? (
          <Form.Item name="brandIds" rules={[{ required: true, message: '请选择至少一个品牌' }]}>
            <EntityMultiPicker label="指定品牌" placeholder="搜索品牌" options={brandOptions} />
          </Form.Item>
        ) : null}

        {scope === 'product' ? (
          <Form.Item name="productIds" rules={[{ required: true, message: '请选择至少一个商品' }]}>
            <EntityMultiPicker
              label="指定商品"
              placeholder="搜索名称 / SPU"
              options={productOptions}
              loading={productLoading}
              onSearch={(keyword) => {
                void searchProducts(keyword);
              }}
            />
          </Form.Item>
        ) : null}

        <Form.Item label="可与其他优惠券叠加" name="stackable" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="优惠类型" name="discountType" rules={[{ required: true }]}>
          <Select options={discountTypeOptions} />
        </Form.Item>

        {discountType === 'fixed_amount' ? (
          <Form.Item
            label={`优惠门槛（${defaultCurrencyCode}）`}
            name="thresholdAmount"
            rules={[{ required: true, message: '请填写门槛' }]}
            extra="填 0 表示无门槛"
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        ) : null}

        <Form.Item
          label={discountType === 'percent' ? '优惠幅度（%）' : `优惠幅度（${defaultCurrencyCode}）`}
          name="discountValue"
          rules={[{ required: true, message: '请填写优惠幅度' }]}
        >
          <InputNumber
            min={discountType === 'percent' ? 0.01 : 0.01}
            max={discountType === 'percent' ? 100 : undefined}
            precision={discountType === 'percent' ? 4 : 2}
            style={{ width: '100%' }}
            addonAfter={discountType === 'percent' ? '%' : defaultCurrencyCode}
          />
        </Form.Item>

        {discountType === 'percent' ? (
          <Form.Item label={`最多抵扣（${defaultCurrencyCode}）`} name="maxDiscountAmount">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        ) : null}

        <Form.Item label="优惠开始时间" name="startsAt">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="优惠结束时间" name="endsAt">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: 8 }}>使用限制</Typography.Title>
        <Form.Item
          label="总张数"
          name="totalQuota"
          extra={editing ? `已发放 ${editing.issuedQuantity} 张` : '留空表示不限'}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="不限" />
        </Form.Item>
        <Form.Item label="每客户限领" name="perUserLimit" extra="留空表示不限">
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="不限" />
        </Form.Item>
        <Form.Item
          label="新用户注册赠送"
          name="grantOnRegister"
          valuePropName="checked"
          extra="开启后，客户在前台注册成功时自动获得 1 张（受总张数与每人限领约束）"
        >
          <Switch />
        </Form.Item>

        <Form.Item label="启用" name="status" getValueProps={(value) => ({ checked: value === 'active' })} getValueFromEvent={(checked: boolean) => (checked ? 'active' : 'inactive')}>
          <Switch />
        </Form.Item>

        <Form.Item label="备注" name="note">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
