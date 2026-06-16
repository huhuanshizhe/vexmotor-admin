'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classnames';

type ToggleFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
};

export function Checkbox({ className, label, ...props }: ToggleFieldProps) {
  return (
    <label className={cn('ui-toggle-field', className)}>
      <input type="checkbox" className="ui-toggle-input" {...props} />
      <span className="ui-toggle-indicator" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ className, label, ...props }: ToggleFieldProps) {
  return (
    <label className={cn('ui-toggle-field', className)}>
      <input type="radio" className="ui-toggle-input" {...props} />
      <span className="ui-toggle-indicator is-radio" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onCheckedChange, label, disabled = false, className }: SwitchProps) {
  return (
    <label className={cn('ui-switch', disabled && 'is-disabled', className)}>
      <button
        type="button"
        className={cn('ui-switch-track', checked && 'is-checked')}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="ui-switch-thumb" />
      </button>
      <span>{label}</span>
    </label>
  );
}