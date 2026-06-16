import { cn } from '@/lib/classnames';

type SkeletonProps = {
  variant?: 'line' | 'card' | 'table';
  className?: string;
};

export function Skeleton({ variant = 'line', className }: SkeletonProps) {
  return <div className={cn('ui-skeleton', `is-${variant}`, className)} aria-hidden="true" />;
}