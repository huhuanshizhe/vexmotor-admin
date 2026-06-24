import { asc, eq } from 'drizzle-orm';

import { getDefaultCurrencyForLanguage, isCommonCurrencyCode } from '@/lib/currencies';
import { COMMON_LANGUAGES, getCommonLanguage } from '@/lib/languages';
import { db } from '@/server/db';
import { siteLanguages } from '@/server/db/schema';

export type SiteLanguageStatus = 'active' | 'inactive';

export type AdminSiteLanguageRow = {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  direction: 'ltr' | 'rtl';
  countryCodes: string[];
  currencyCode: string;
  status: SiteLanguageStatus;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateSiteLanguageInput = {
  status?: SiteLanguageStatus;
  isDefault?: boolean;
  sortOrder?: number;
  currencyCode?: string;
};

const initialLanguageCodes = ['en', 'de', 'es'];

const initialLanguageCurrencies: Record<string, string> = {
  en: 'USD',
  de: 'EUR',
  es: 'EUR',
};

function now() {
  return new Date();
}

async function seedDatabaseLanguages() {
  const existing = await db.select({ code: siteLanguages.code }).from(siteLanguages).limit(1);
  if (existing.length > 0) {
    return;
  }

  const rows = initialLanguageCodes
    .map((code, index) => {
      const language = getCommonLanguage(code);
      if (!language) return null;
      return {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        region: language.region,
        direction: language.direction,
        countryCodes: language.countryCodes ?? [],
        currencyCode: initialLanguageCurrencies[code] ?? getDefaultCurrencyForLanguage(code),
        status: 'active' as SiteLanguageStatus,
        isDefault: code === 'en',
        sortOrder: index,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length) {
    await db.insert(siteLanguages).values(rows).onConflictDoNothing();
  }
}

export async function getAdminSiteLanguages(): Promise<AdminSiteLanguageRow[]> {
  await seedDatabaseLanguages();
  return db.select().from(siteLanguages).orderBy(asc(siteLanguages.sortOrder), asc(siteLanguages.name));
}

export async function getAvailableCommonLanguages() {
  const enabled = await getAdminSiteLanguages();
  const enabledCodes = new Set(enabled.map((item) => item.code));
  return COMMON_LANGUAGES.filter((language) => !enabledCodes.has(language.code));
}

export async function addAdminSiteLanguage(code: string, currencyCode: string) {
  const language = getCommonLanguage(code);
  if (!language || !isCommonCurrencyCode(currencyCode)) {
    return null;
  }

  const current = await getAdminSiteLanguages();
  const nextSortOrder = current.length ? Math.max(...current.map((item) => item.sortOrder)) + 1 : 0;
  const shouldBeDefault = current.length === 0;

  if (shouldBeDefault) {
    await db.update(siteLanguages).set({ isDefault: false, updatedAt: now() });
  }

  const [created] = await db
    .insert(siteLanguages)
    .values({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      region: language.region,
      direction: language.direction,
      countryCodes: language.countryCodes ?? [],
      currencyCode,
      status: 'active',
      isDefault: shouldBeDefault,
      sortOrder: nextSortOrder,
    })
    .onConflictDoNothing()
    .returning();

  return created ?? (await getAdminSiteLanguages()).find((item) => item.code === code) ?? null;
}

export async function updateAdminSiteLanguage(code: string, input: UpdateSiteLanguageInput) {
  const rows = await getAdminSiteLanguages();
  const existing = rows.find((item) => item.code === code);
  if (!existing) {
    return null;
  }

  if (input.currencyCode && !isCommonCurrencyCode(input.currencyCode)) {
    return null;
  }

  if (existing.isDefault && input.status === 'inactive') {
    return null;
  }

  if (input.isDefault) {
    await db.update(siteLanguages).set({ isDefault: false, updatedAt: now() });
  }

  const patch: Partial<typeof siteLanguages.$inferInsert> = {
    updatedAt: now(),
  };

  if (input.isDefault !== undefined) {
    patch.isDefault = input.isDefault;
    if (input.isDefault) {
      patch.status = 'active';
    }
  }

  if (input.status !== undefined && !input.isDefault) {
    patch.status = input.status;
  }

  if (input.sortOrder !== undefined) {
    patch.sortOrder = input.sortOrder;
  }

  if (input.currencyCode !== undefined) {
    patch.currencyCode = input.currencyCode;
  }

  const [updated] = await db
    .update(siteLanguages)
    .set(patch)
    .where(eq(siteLanguages.code, code))
    .returning();

  return updated ?? null;
}