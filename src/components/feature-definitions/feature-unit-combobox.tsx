'use client';

import { AutoComplete } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { FeatureValueType } from '@/lib/feature-definition-content';
import {
  buildFeatureUnitAutoCompleteOptions,
  filterFeatureUnits,
  getDefaultUnitsForLocale,
  isUnitRequiredForValueType,
} from '@/lib/feature-units';

type FeatureUnitComboboxProps = {
  locale: string;
  valueType: FeatureValueType;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

export function FeatureUnitCombobox({
  locale,
  valueType,
  value,
  onChange,
  disabled,
}: FeatureUnitComboboxProps) {
  const [keyword, setKeyword] = useState(value ?? '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const unitRequired = isUnitRequiredForValueType(valueType);
  const unitDisabled = disabled || !unitRequired;

  useEffect(() => {
    setKeyword(value ?? '');
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const options = useMemo(() => {
    const filtered = filterFeatureUnits(debouncedKeyword);
    const defaults = getDefaultUnitsForLocale(locale);
    const merged = [...defaults, ...filtered].filter(
      (unit, index, array) => array.findIndex((item) => item.code === unit.code) === index,
    );
    return buildFeatureUnitAutoCompleteOptions(merged);
  }, [debouncedKeyword, locale]);

  return (
    <AutoComplete
      value={keyword}
      options={options}
      disabled={unitDisabled}
      placeholder={unitRequired ? '输入或选择值单位' : '该值类型无需单位'}
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
