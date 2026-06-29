import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { siteLanguages } from '@/server/db/schema';

const FALLBACK_DEFAULT_LOCALE = 'en';

export async function getDefaultSiteLanguageCode(): Promise<string> {
  const [defaultRow] = await db
    .select({ code: siteLanguages.code })
    .from(siteLanguages)
    .where(eq(siteLanguages.isDefault, true))
    .limit(1);

  if (defaultRow?.code) return defaultRow.code;

  const [firstActive] = await db
    .select({ code: siteLanguages.code })
    .from(siteLanguages)
    .where(eq(siteLanguages.status, 'active'))
    .orderBy(asc(siteLanguages.sortOrder), asc(siteLanguages.code))
    .limit(1);

  return firstActive?.code ?? FALLBACK_DEFAULT_LOCALE;
}
