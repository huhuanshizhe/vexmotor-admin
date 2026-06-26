'use client';

import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { CategoryPickerModal } from '@/components/categories/category-picker-modal';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { buildCategoryPathMap, formatCategorySelectedDisplay } from '@/lib/category-picker';

type CategoryPickerFieldBaseProps = {
  categoryTree: AdminCategoryTreeNode[];
  addButtonLabel?: string;
};

type CategoryPickerFieldSingleProps = CategoryPickerFieldBaseProps & {
  mode: 'single';
  value?: string;
  onChange?: (value: string) => void;
  disabledIds?: never;
};

type CategoryPickerFieldMultipleProps = CategoryPickerFieldBaseProps & {
  mode: 'multiple';
  value?: string[];
  onChange?: (value: string[]) => void;
  disabledIds?: ReadonlySet<string>;
};

export type CategoryPickerFieldProps = CategoryPickerFieldSingleProps | CategoryPickerFieldMultipleProps;

export function CategoryPickerField(props: CategoryPickerFieldProps) {
  const {
    mode,
    categoryTree,
    addButtonLabel = '添加分类',
  } = props;

  const [pickerOpen, setPickerOpen] = useState(false);

  const pathMap = useMemo(() => buildCategoryPathMap(categoryTree), [categoryTree]);

  const selectedIds = useMemo(() => {
    if (mode === 'single') {
      return props.value ? [props.value] : [];
    }
    return props.value ?? [];
  }, [mode, props]);

  const disabledIds = useMemo(() => {
    if (mode === 'multiple') {
      return props.disabledIds ?? new Set(selectedIds);
    }
    return new Set<string>();
  }, [mode, props, selectedIds]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => {
      const info = pathMap.get(id);
      if (!info) {
        return { id, name: id, parentPathLabel: null };
      }
      return { id, ...formatCategorySelectedDisplay(info) };
    }),
    [pathMap, selectedIds],
  );

  function removeSelected(id: string) {
    if (mode === 'single') {
      props.onChange?.('');
      return;
    }
    props.onChange?.(selectedIds.filter((item) => item !== id));
  }

  function handleConfirm(newIds: string[]) {
    if (mode === 'single') {
      props.onChange?.(newIds[0] ?? '');
      setPickerOpen(false);
      return;
    }

    const merged = [...new Set([...selectedIds, ...newIds])];
    props.onChange?.(merged);
    setPickerOpen(false);
  }

  return (
    <div className="entity-picker-field">
      <div className="entity-picker-selected">
        {!selectedItems.length ? (
          <Typography.Text type="secondary">尚未选择</Typography.Text>
        ) : (
          selectedItems.map((item) => (
            <div key={item.id} className="entity-picker-selected__item">
              <div className="entity-picker-selected__body">
                {item.parentPathLabel ? (
                  <div className="entity-picker-selected__meta entity-picker-selected__meta--above">{item.parentPathLabel}</div>
                ) : null}
                <div className="entity-picker-selected__name">{item.name}</div>
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

      <CategoryPickerModal
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
