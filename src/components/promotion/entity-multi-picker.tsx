'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Select, Space, Tag } from 'antd';
import { useMemo, useState } from 'react';

export type EntityOption = {
  value: string;
  label: string;
};

type EntityMultiPickerProps = {
  label: string;
  placeholder: string;
  value?: string[];
  options: EntityOption[];
  onChange?: (next: string[]) => void;
  onSearch?: (keyword: string) => void;
  loading?: boolean;
};

export function EntityMultiPicker({
  label,
  placeholder,
  value = [],
  options,
  onChange = () => undefined,
  onSearch,
  loading,
}: EntityMultiPickerProps) {
  const [pendingId, setPendingId] = useState<string | undefined>();

  const selectedItems = useMemo(
    () => value.map((id) => {
      const matched = options.find((option) => option.value === id);
      return { id, label: matched?.label ?? id };
    }),
    [options, value],
  );

  const availableOptions = useMemo(
    () => options.filter((option) => !value.includes(option.value)),
    [options, value],
  );

  function addSelected() {
    if (!pendingId || value.includes(pendingId)) return;
    onChange([...value, pendingId]);
    setPendingId(undefined);
  }

  function removeSelected(id: string) {
    onChange(value.filter((item) => item !== id));
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span>{label}</span>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          showSearch
          allowClear
          placeholder={placeholder}
          style={{ flex: 1 }}
          value={pendingId}
          loading={loading}
          options={availableOptions}
          optionFilterProp="label"
          onSearch={onSearch}
          onChange={(next) => setPendingId(next)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={addSelected} disabled={!pendingId}>
          添加
        </Button>
      </Space.Compact>
      <Space size={[8, 8]} wrap>
        {!selectedItems.length ? <span style={{ color: '#677489' }}>尚未选择</span> : null}
        {selectedItems.map((item) => (
          <Tag key={item.id} closable onClose={() => removeSelected(item.id)}>
            {item.label}
          </Tag>
        ))}
      </Space>
    </div>
  );
}
