'use client';

import { Select } from 'antd';

export type EditorialBoardOption = {
  key: string;
  title: string;
};

type BoardMultiSelectProps = {
  boards: EditorialBoardOption[];
  lockedBoardKey: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function BoardMultiSelect({
  boards,
  lockedBoardKey,
  value,
  onChange,
  disabled,
}: BoardMultiSelectProps) {
  const options = boards.map((board) => ({
    value: board.key,
    label: board.title || board.key,
    disabled: board.key === lockedBoardKey,
  }));

  function handleChange(next: string[]) {
    const withLocked = next.includes(lockedBoardKey) ? next : [lockedBoardKey, ...next];
    onChange(withLocked);
  }

  return (
    <Select
      mode="multiple"
      disabled={disabled}
      value={value}
      onChange={handleChange}
      options={options}
      placeholder="选择所属看板"
      style={{ width: '100%' }}
    />
  );
}
