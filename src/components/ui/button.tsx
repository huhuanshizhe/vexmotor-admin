import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classnames';

type ButtonVariant = 'primary' | 'secondary' | 'brand' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
};

type LinkButtonProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    external?: boolean;
  };

type NativeButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export type ButtonProps = LinkButtonProps | NativeButtonProps;

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  className,
  ...rest
}: ButtonProps) {
  const buttonClassName = cn('ui-button', `is-${variant}`, `is-${size}`, loading && 'is-loading', className);
  const content = (
    <>
      {icon ? <span className="ui-button-icon">{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  if ('href' in rest && rest.href) {
    if (rest.external) {
      const { href, external, ...anchorProps } = rest;

      return (
        <a href={href} className={buttonClassName} target="_blank" rel="noreferrer" {...anchorProps}>
          {content}
        </a>
      );
    }

    const { href, ...linkProps } = rest;
    return (
      <Link href={href} className={buttonClassName} {...linkProps}>
        {content}
      </Link>
    );
  }

  const { disabled, type, ...buttonProps } = rest as NativeButtonProps;

  return (
    <button type={type ?? 'button'} className={buttonClassName} aria-busy={loading} disabled={loading || disabled} {...buttonProps}>
      {content}
    </button>
  );
}