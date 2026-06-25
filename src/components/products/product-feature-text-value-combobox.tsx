'use client';

import { AutoComplete } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { sortLocaleText } from '@/lib/sort-locale-text';

type ProductFeatureTextValueComboboxProps = {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

export function ProductFeatureTextValueCombobox({
  options,
  value,
  onChange,
  disabled,
}: ProductFeatureTextValueComboboxProps) {
  const [keyword, setKeyword] = useState(value ?? '');

  useEffect(() => {
    setKeyword(value ?? '');
  }, [value]);

  const sortedOptions = useMemo(() => sortLocaleText(options), [options]);
  const autocompleteOptions = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const source = query
      ? sortedOptions.filter((item) => item.toLowerCase().includes(query))
      : sortedOptions;
    return source.map((item) => ({ value: item }));
  }, [keyword, sortedOptions]);

  return (
    <AutoComplete
      value={keyword}
      options={autocompleteOptions}
      disabled={disabled}
      placeholder="输入或选择文本值"
      onChange={(next) => {
        setKeyword(next);
        onChange?.(next);
      }}
      onSelect={(next) => {
        setKeyword(next);
        onChange?.(next);
      }}
      allowClear
      style={{ width: '100%' }}
      filterOption={false}
    />
  );
}
