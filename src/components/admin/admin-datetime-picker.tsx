'use client';

import { DatePicker, TimePicker } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo } from 'react';

export type AdminDateTimePickerMode = 'date' | 'datetime' | 'time';

export const ADMIN_DATETIME_PICKER_FORMAT = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  time: 'HH:mm:ss',
} as const;

const PLACEHOLDER: Record<AdminDateTimePickerMode, string> = {
  date: '请选择日期',
  datetime: '请选择日期时间',
  time: '请选择时间',
};

const POPUP_ROOT_CLASS = 'admin-datetime-picker-popup';

export type AdminDateTimePickerProps = {
  mode?: AdminDateTimePickerMode;
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabledDate?: DatePickerProps['disabledDate'];
  disabledTime?: DatePickerProps['disabledTime'];
  status?: DatePickerProps['status'];
};

export function AdminDateTimePicker({
  mode = 'date',
  value,
  onChange,
  disabled,
  placeholder,
  className,
  style,
  allowClear = true,
  disabledDate,
  disabledTime,
  status,
}: AdminDateTimePickerProps) {
  const resolvedPlaceholder = placeholder ?? PLACEHOLDER[mode];
  const popupClassNames = useMemo(() => ({ popup: { root: POPUP_ROOT_CLASS } }), []);
  const mergedStyle = useMemo(() => ({ width: '100%', ...style }), [style]);

  if (mode === 'time') {
    return (
      <TimePicker
        value={value}
        onChange={onChange}
        format={ADMIN_DATETIME_PICKER_FORMAT.time}
        placeholder={resolvedPlaceholder}
        className={className}
        style={mergedStyle}
        disabled={disabled}
        allowClear={allowClear}
        status={status}
        needConfirm
        showNow
        changeOnScroll
        classNames={popupClassNames}
      />
    );
  }

  return (
    <DatePicker
      value={value}
      onChange={onChange}
      format={mode === 'datetime' ? ADMIN_DATETIME_PICKER_FORMAT.datetime : ADMIN_DATETIME_PICKER_FORMAT.date}
      placeholder={resolvedPlaceholder}
      className={className}
      style={mergedStyle}
      disabled={disabled}
      allowClear={allowClear}
      status={status}
      disabledDate={disabledDate}
      disabledTime={mode === 'datetime' ? disabledTime : undefined}
      needConfirm={mode === 'datetime'}
      showNow={mode === 'datetime'}
      showTime={
        mode === 'datetime'
          ? {
              format: ADMIN_DATETIME_PICKER_FORMAT.time,
              defaultOpenValue: dayjs('00:00:00', ADMIN_DATETIME_PICKER_FORMAT.time),
            }
          : false
      }
      classNames={mode === 'datetime' ? popupClassNames : undefined}
    />
  );
}
