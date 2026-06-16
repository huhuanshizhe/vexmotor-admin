import type { ReactNode } from 'react';

import { cn } from '@/lib/classnames';

type BadgeVariant = 'stock-ok' | 'stock-low' | 'stock-out' | 'lead-time' | 'mto' | 'new' | 'promo' | 'tier';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant = 'promo', children, className }: BadgeProps) {
  return <span className={cn('ui-badge', `is-${variant}`, className)}>{children}</span>;
}