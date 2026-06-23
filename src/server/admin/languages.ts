import { asc, eq } from 'drizzle-orm';

import { COMMON_LANGUAGES, getCommonLanguage, type CommonLanguage } from '@/lib/languages';
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
};

const initialLanguageCodes = ['en', 'de', 'es'];

function now() {
  return new Date();
}

function toRow(language: CommonLanguage, input?: Partial<AdminSiteLanguageRow>): AdminSiteLanguageRow {
  const date = now();
  return {
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
    region: language.region,
    direction: language.direction,
    countryCodes: language.countryCodes ?? [],
    status: input?.status ?? 'active',
    isDefault: input?.isDefault ?? language.code === 'en',
    sortOrder: input?.sortOrder ?? initialLanguageCodes.indexOf(language.code),
    createdAt: input?.createdAt ?? date,
    updatedAt: input?.updatedAt ?? date,
  };
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

export async function addAdminSiteLanguage(code: string) {
  const language = getCommonLanguage(code);
  if (!language) {
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

  if (existing.isDefault && input.status === 'inactive') {
    return null;
  }

  if (input.isDefault) {
    await db.update(siteLanguages).set({ isDefault: false, updatedAt: now() });
  }

  const [updated] = await db
    .update(siteLanguages)
    .set({
      status: input.isDefault ? 'active' : input.status,
      isDefault: input.isDefault,
      sortOrder: input.sortOrder,
      updatedAt: now(),
    })
    .where(eq(siteLanguages.code, code))
    .returning();

  return updated ?? null;
}
