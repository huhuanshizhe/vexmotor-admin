import type { ReactNode } from 'react';

import { cn } from '@/lib/classnames';

type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn('ui-tooltip', className)} data-tooltip={content} tabIndex={0} aria-label={content}>
      {children}
    </span>
  );
}