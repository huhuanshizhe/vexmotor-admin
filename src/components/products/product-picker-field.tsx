'use client';

import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { ProductPickerModal } from '@/components/products/product-picker-modal';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import {
  type ProductPickerItem,
  formatProductSelectedDisplay,
} from '@/lib/product-picker';

type ProductPickerFieldBaseProps = {
  categoryTree: AdminCategoryTreeNode[];
  addButtonLabel?: string;
};

type ProductPickerFieldSingleProps = ProductPickerFieldBaseProps & {
  mode: 'single';
  value?: string;
  onChange?: (value: string) => void;
  disabledIds?: never;
};

type ProductPickerFieldMultipleProps = ProductPickerFieldBaseProps & {
  mode: 'multiple';
  value?: string[];
  onChange?: (value: string[]) => void;
  disabledIds?: ReadonlySet<string>;
};

export type ProductPickerFieldProps = ProductPickerFieldSingleProps | ProductPickerFieldMultipleProps;

async function lookupProducts(ids: string[]): Promise<ProductPickerItem[]> {
  if (!ids.length) return [];
  const response = await fetch('/api/admin/products/picker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items: ProductPickerItem[] };
  return payload.items ?? [];
}

export function ProductPickerField(props: ProductPickerFieldProps) {
  const { mode, categoryTree, addButtonLabel = '添加商品' } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cache, setCache] = useState<Map<string, ProductPickerItem>>(new Map());

  const selectedIds = useMemo(() => {
    if (mode === 'single') return props.value ? [props.value] : [];
    return props.value ?? [];
  }, [mode, props]);

  const disabledIds = useMemo(() => {
    if (mode === 'multiple') return props.disabledIds ?? new Set(selectedIds);
    return new Set<string>();
  }, [mode, props, selectedIds]);

  useEffect(() => {
    const missing = selectedIds.filter((id) => !cache.has(id));
    if (!missing.length) return;
    void lookupProducts(missing).then((items) => {
      setCache((current) => {
        const next = new Map(current);
        for (const item of items) next.set(item.id, item);
        return next;
      });
    });
  }, [cache, selectedIds]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => {
      const item = cache.get(id);
      if (!item) {
        return {
          id,
          name: id,
          meta: null as string | null,
          priceLabel: null as string | null,
          coverUrl: null as string | null,
        };
      }
      const display = formatProductSelectedDisplay(item);
      return {
        id,
        name: display.name,
        meta: display.meta,
        priceLabel: display.priceLabel,
        coverUrl: item.coverUrl,
      };
    }),
    [cache, selectedIds],
  );

  function removeSelected(id: string) {
    if (mode === 'single') {
      props.onChange?.('');
      return;
    }
    props.onChange?.(selectedIds.filter((item) => item !== id));
  }

  function mergeCacheItems(items: ProductPickerItem[]) {
    if (!items.length) return;
    setCache((current) => {
      const next = new Map(current);
      for (const item of items) next.set(item.id, item);
      return next;
    });
  }

  function handleConfirm(newIds: string[], confirmedItems: ProductPickerItem[]) {
    mergeCacheItems(confirmedItems);
    const missingIds = newIds.filter((id) => !confirmedItems.some((item) => item.id === id));
    if (missingIds.length) {
      void lookupProducts(missingIds).then(mergeCacheItems);
    }

    if (mode === 'single') {
      props.onChange?.(newIds[0] ?? '');
      setPickerOpen(false);
      return;
    }

    props.onChange?.([...new Set([...selectedIds, ...newIds])]);
    setPickerOpen(false);
  }

  return (
    <div className="entity-picker-field">
      <div className="entity-picker-selected">
        {!selectedItems.length ? (
          <Typography.Text type="secondary">尚未选择</Typography.Text>
        ) : (
          selectedItems.map((item) => (
            <div key={item.id} className="entity-picker-selected__item entity-picker-selected__item--product">
              <div className="entity-picker-selected__content">
                <Avatar
                  shape="square"
                  size={40}
                  src={item.coverUrl ?? undefined}
                  className="entity-picker-selected__thumb"
                >
                  {item.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <div className="entity-picker-selected__body">
                  <div className="entity-picker-selected__name">{item.name}</div>
                  {item.meta ? (
                    <div className="entity-picker-selected__meta">{item.meta}</div>
                  ) : null}
                  {item.priceLabel ? (
                    <div className="entity-picker-selected__price">{item.priceLabel}</div>
                  ) : null}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                aria-label={`移除 ${item.name}`}
                onClick={() => removeSelected(item.id)}
              />
            </div>
          ))
        )}
      </div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
        {addButtonLabel}
      </Button>

      <ProductPickerModal
        open={pickerOpen}
        mode={mode}
        categoryTree={categoryTree}
        disabledIds={disabledIds}
        onCancel={() => setPickerOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
