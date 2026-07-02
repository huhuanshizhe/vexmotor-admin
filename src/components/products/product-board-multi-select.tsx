'use client';

import { Select } from 'antd';

export type ProductBoardOption = {
  key: string;
  title: string;
};

type ProductBoardMultiSelectProps = {
  boards: ProductBoardOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function ProductBoardMultiSelect({
  boards,
  value,
  onChange,
  disabled,
}: ProductBoardMultiSelectProps) {
  const options = boards.map((board) => ({
    value: board.key,
    label: board.title || board.key,
  }));

  return (
    <Select
      mode="multiple"
      allowClear
      disabled={disabled}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="选择关联看板（可选）"
      style={{ width: '100%' }}
    />
  );
}
