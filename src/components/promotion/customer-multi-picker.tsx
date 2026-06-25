'use client';

import { useCallback, useEffect, useState } from 'react';

import { EntityMultiPicker } from '@/components/promotion/entity-multi-picker';

type CustomerMultiPickerProps = {
  value?: string[];
  onChange?: (next: string[]) => void;
};

type CustomerSearchItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export function CustomerMultiPicker({ value = [], onChange = () => undefined }: CustomerMultiPickerProps) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  const loadCustomers = useCallback(async (keyword: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '20');
      if (keyword.trim()) params.set('keyword', keyword.trim());

      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!response.ok) return;

      const payload = (await response.json()) as { items: CustomerSearchItem[] };
      const nextOptions = (payload.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.firstName} ${item.lastName}`.trim() + ` · ${item.email}`,
      }));

      setOptions((current) => {
        const map = new Map(current.map((item) => [item.value, item]));
        nextOptions.forEach((item) => map.set(item.value, item));
        value.forEach((id) => {
          if (!map.has(id)) map.set(id, { value: id, label: id });
        });
        return [...map.values()];
      });
    } finally {
      setLoading(false);
    }
  }, [value]);

  useEffect(() => {
    void loadCustomers('');
  }, [loadCustomers]);

  return (
    <EntityMultiPicker
      label="指定客户"
      placeholder="搜索姓名 / 邮箱 / 公司"
      value={value}
      options={options}
      loading={loading}
      onSearch={(keyword) => {
        void loadCustomers(keyword);
      }}
      onChange={onChange}
    />
  );
}
