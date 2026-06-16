import Link from 'next/link';
import { Fragment } from 'react';

import { cn } from '@/lib/classnames';

type PaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
};

function getVisiblePages(page: number, totalPages: number) {
  const visiblePages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  return Array.from(visiblePages).filter((value) => value >= 1 && value <= totalPages).sort((left, right) => left - right);
}

export function Pagination({ page, totalPages, buildHref, className }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav className={cn('ui-pagination', className)} aria-label="Pagination">
      <Link href={buildHref(Math.max(1, page - 1))} className={cn('ui-pagination-link', page <= 1 && 'is-disabled')} aria-disabled={page <= 1}>
        Prev
      </Link>

      {visiblePages.map((value, index) => (
        <Fragment key={value}>
          {index > 0 && value - visiblePages[index - 1] > 1 ? <span className="ui-pagination-gap">…</span> : null}
          <Link href={buildHref(value)} className={cn('ui-pagination-link', value === page && 'is-active')} aria-current={value === page ? 'page' : undefined}>
            {value}
          </Link>
        </Fragment>
      ))}

      <Link href={buildHref(Math.min(totalPages, page + 1))} className={cn('ui-pagination-link', page >= totalPages && 'is-disabled')} aria-disabled={page >= totalPages}>
        Next
      </Link>
    </nav>
  );
}