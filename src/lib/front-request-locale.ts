import type { NextRequest } from 'next/server';

import { DEFAULT_LOCALE, LOCALE_REQUEST_HEADER, normalizeLocale, type Locale } from '@/lib/i18n';

export function resolveFrontRequestLocale(
  request: Pick<NextRequest, 'headers' | 'nextUrl'>,
): Locale {
  const headerLocale = request.headers.get(LOCALE_REQUEST_HEADER);
  const queryLocale = request.nextUrl.searchParams.get('locale');
  return normalizeLocale(headerLocale ?? queryLocale);
}

export function resolveLocaleValue(value?: string | null): Locale {
  return normalizeLocale(value ?? DEFAULT_LOCALE);
}
