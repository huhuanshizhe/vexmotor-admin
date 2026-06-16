import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/classnames';
import type { UnitSystem } from '@/lib/i18n';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn('ui-input', className)} {...props} />;
}

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  compact?: boolean;
};

export function NumberInput({ className, compact = false, ...props }: NumberInputProps) {
  return <input type="number" inputMode="numeric" className={cn('ui-input', compact && 'is-compact', className)} {...props} />;
}

type SelectUnitProps = SelectHTMLAttributes<HTMLSelectElement> & {
  value: UnitSystem;
};

export function SelectUnit({ className, ...props }: SelectUnitProps) {
  return (
    <select className={cn('ui-select', className)} {...props}>
      <option value="metric">Metric</option>
      <option value="imperial">Imperial</option>
    </select>
  );
}