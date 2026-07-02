import { and, asc, eq, inArray, like, notInArray, or, sql } from 'drizzle-orm';

import { getSiteUrl } from '@/lib/app-urls';
import {
  type AdminUiStringRow,
  type UiStringResetScope,
  type UiStringStatus,
  type UiStringTranslationSource,
  type UiStringsManifest,
  UI_STRING_SOURCE_LOCALE,
} from '@/lib/ui-strings';
import { translateText } from '@/server/ai/translate';
import { getAdminSiteLanguages } from '@/server/admin/languages';
import { db } from '@/server/db';
import { uiStringTranslations, uiStrings } from '@/server/db/schema';

function now() {
  return new Date();
}

function resolveManifestUrl(manifestUrl?: string | null) {
  const configured = manifestUrl?.trim() || process.env.WEB_UI_STRINGS_MANIFEST_URL?.trim();
  if (configured) {
    return configured;
  }
  return `${getSiteUrl()}/api/ui-strings/manifest`;
}

export function getUiStringsManifestUrl(manifestUrl?: string | null) {
  return resolveManifestUrl(manifestUrl);
}

export async function fetchUiStringsManifest(manifestUrl?: string | null): Promise<UiStringsManifest> {
  const url = resolveManifestUrl(manifestUrl);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`MANIFEST_FETCH_FAILED:${response.status}`);
  }
  return response.json() as Promise<UiStringsManifest>;
}

async function getActiveNonEnglishLocales() {
  const languages = await getAdminSiteLanguages();
  return languages.filter((item) => item.status === 'active' && item.code !== UI_STRING_SOURCE_LOCALE).map((item) => item.code);
}

function toAdminRow(
  row: typeof uiStrings.$inferSelect,
  translations: Array<typeof uiStringTranslations.$inferSelect>,
  targetLocales: string[],
): AdminUiStringRow {
  const translationMap: AdminUiStringRow['translations'] = {};
  for (const item of translations) {
    translationMap[item.locale] = {
      value: item.value,
      source: item.source as UiStringTranslationSource,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  const missingLocales = targetLocales.filter((locale) => !translationMap[locale]?.value?.trim());

  return {
    key: row.key,
    defaultText: row.defaultText,
    group: row.group,
    context: row.context,
    status: row.status as UiStringStatus,
    updatedAt: row.updatedAt.toISOString(),
    translations: translationMap,
    missingLocales,
  };
}

export async function getAdminUiStrings(options?: {
  group?: string;
  status?: UiStringStatus;
  missingOnly?: boolean;
  search?: string;
}) {
  const targetLocales = await getActiveNonEnglishLocales();
  const conditions = [];

  if (options?.group) {
    conditions.push(eq(uiStrings.group, options.group));
  }
  if (options?.status) {
    conditions.push(eq(uiStrings.status, options.status));
  }
  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(like(uiStrings.key, term), like(uiStrings.defaultText, term)));
  }

  const rows = await db
    .select()
    .from(uiStrings)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(uiStrings.group), asc(uiStrings.key));

  if (!rows.length) {
    return { items: [] as AdminUiStringRow[], groups: [] as string[], targetLocales };
  }

  const keys = rows.map((row) => row.key);
  const translations = await db
    .select()
    .from(uiStringTranslations)
    .where(inArray(uiStringTranslations.key, keys));

  const translationsByKey = new Map<string, Array<typeof uiStringTranslations.$inferSelect>>();
  for (const row of translations) {
    const bucket = translationsByKey.get(row.key) ?? [];
    bucket.push(row);
    translationsByKey.set(row.key, bucket);
  }

  let items = rows.map((row) => toAdminRow(row, translationsByKey.get(row.key) ?? [], targetLocales));
  if (options?.missingOnly) {
    items = items.filter((item) => item.missingLocales.length > 0);
  }

  const groups = [...new Set(rows.map((row) => row.group))].sort();
  return { items, groups, targetLocales };
}

export async function updateAdminUiStringTranslation(input: {
  key: string;
  locale: string;
  value: string;
  source?: UiStringTranslationSource;
}) {
  if (input.locale === UI_STRING_SOURCE_LOCALE) {
    throw new Error('ENGLISH_IS_DEFAULT_TEXT');
  }

  const [existing] = await db.select().from(uiStrings).where(eq(uiStrings.key, input.key)).limit(1);
  if (!existing) {
    return null;
  }

  const [saved] = await db
    .insert(uiStringTranslations)
    .values({
      key: input.key,
      locale: input.locale,
      value: input.value,
      source: input.source ?? 'manual',
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [uiStringTranslations.key, uiStringTranslations.locale],
      set: {
        value: input.value,
        source: input.source ?? 'manual',
        updatedAt: now(),
      },
    })
    .returning();

  return saved;
}

export async function syncUiStringsFromManifest(manifestUrl?: string | null) {
  const manifest = await fetchUiStringsManifest(manifestUrl);
  const manifestKeys = manifest.keys.map((item) => item.key);
  const timestamp = now();

  for (const entry of manifest.keys) {
    await db
      .insert(uiStrings)
      .values({
        key: entry.key,
        defaultText: entry.default,
        group: entry.group,
        context: entry.context ?? null,
        status: 'active',
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: uiStrings.key,
        set: {
          defaultText: entry.default,
          group: entry.group,
          context: entry.context ?? null,
          status: 'active',
          updatedAt: timestamp,
        },
      });
  }

  if (manifestKeys.length) {
    await db
      .update(uiStrings)
      .set({ status: 'deprecated', updatedAt: timestamp })
      .where(notInArray(uiStrings.key, manifestKeys));
  }

  const activeCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(uiStrings)
    .where(eq(uiStrings.status, 'active'));

  return {
    manifestVersion: manifest.version,
    syncedAt: timestamp.toISOString(),
    activeCount: activeCount[0]?.count ?? 0,
    deprecatedCount: manifestKeys.length ? (await db.select({ count: sql<number>`count(*)::int` }).from(uiStrings).where(eq(uiStrings.status, 'deprecated')))[0]?.count ?? 0 : 0,
  };
}

export async function resetUiStringTranslations(input: {
  scope: UiStringResetScope;
  locale?: string;
  manifestUrl?: string | null;
}) {
  const timestamp = now();

  if (input.scope === 'all_translations') {
    await db.delete(uiStringTranslations);
    return { scope: input.scope, clearedAt: timestamp.toISOString() };
  }

  if (input.scope === 'locale') {
    if (!input.locale || input.locale === UI_STRING_SOURCE_LOCALE) {
      throw new Error('INVALID_RESET_LOCALE');
    }
    await db.delete(uiStringTranslations).where(eq(uiStringTranslations.locale, input.locale));
    return { scope: input.scope, locale: input.locale, clearedAt: timestamp.toISOString() };
  }

  const manifest = await fetchUiStringsManifest(input.manifestUrl);
  for (const entry of manifest.keys) {
    await db
      .insert(uiStrings)
      .values({
        key: entry.key,
        defaultText: entry.default,
        group: entry.group,
        context: entry.context ?? null,
        status: 'active',
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: uiStrings.key,
        set: {
          defaultText: entry.default,
          group: entry.group,
          context: entry.context ?? null,
          status: 'active',
          updatedAt: timestamp,
        },
      });
  }

  await db.delete(uiStringTranslations);
  return { scope: input.scope, rebuiltAt: timestamp.toISOString(), manifestVersion: manifest.version };
}

export async function translateMissingUiStringsBatch(input: {
  group?: string;
  locales?: string[];
  keys?: string[];
  limit?: number;
}) {
  const targetLocales = input.locales?.length
    ? input.locales.filter((locale) => locale !== UI_STRING_SOURCE_LOCALE)
    : await getActiveNonEnglishLocales();

  if (!targetLocales.length) {
    return { translated: 0, skipped: 0, errors: [] as string[] };
  }

  const conditions = [eq(uiStrings.status, 'active')];
  if (input.group) {
    conditions.push(eq(uiStrings.group, input.group));
  }
  if (input.keys?.length) {
    conditions.push(inArray(uiStrings.key, input.keys));
  }

  const rows = await db
    .select()
    .from(uiStrings)
    .where(and(...conditions))
    .orderBy(asc(uiStrings.group), asc(uiStrings.key))
    .limit(input.limit ?? 200);

  let translated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const existingTranslations = await db
      .select()
      .from(uiStringTranslations)
      .where(eq(uiStringTranslations.key, row.key));

    const existingLocales = new Set(existingTranslations.map((item) => item.locale));

    for (const locale of targetLocales) {
      if (existingLocales.has(locale)) {
        skipped += 1;
        continue;
      }

      try {
        const value = await translateText({
          text: row.defaultText,
          sourceLocale: UI_STRING_SOURCE_LOCALE,
          targetLocale: locale,
          context: row.context ?? `UI string ${row.key}`,
        });

        await updateAdminUiStringTranslation({
          key: row.key,
          locale,
          value,
          source: 'llm',
        });
        translated += 1;
      } catch (error) {
        errors.push(`${row.key}:${locale}:${error instanceof Error ? error.message : 'unknown'}`);
      }
    }
  }

  return { translated, skipped, errors };
}

export async function getFrontUiStrings(input: {
  locale: string;
  keys?: string[];
  groups?: string[];
}) {
  const locale = input.locale || UI_STRING_SOURCE_LOCALE;
  const conditions = [eq(uiStrings.status, 'active')];

  if (input.keys?.length) {
    conditions.push(inArray(uiStrings.key, input.keys));
  } else if (input.groups?.length) {
    conditions.push(inArray(uiStrings.group, input.groups));
  }

  const rows = await db
    .select()
    .from(uiStrings)
    .where(and(...conditions))
    .orderBy(asc(uiStrings.key));

  if (!rows.length) {
    return { locale, strings: {} as Record<string, string> };
  }

  if (locale === UI_STRING_SOURCE_LOCALE) {
    const strings: Record<string, string> = {};
    for (const row of rows) {
      strings[row.key] = row.defaultText;
    }
    return { locale, strings };
  }

  const keys = rows.map((row) => row.key);
  const translations = await db
    .select()
    .from(uiStringTranslations)
    .where(and(inArray(uiStringTranslations.key, keys), eq(uiStringTranslations.locale, locale)));

  const translationMap = new Map(translations.map((row) => [row.key, row.value]));
  const strings: Record<string, string> = {};

  for (const row of rows) {
    strings[row.key] = translationMap.get(row.key)?.trim() || row.defaultText;
  }

  return { locale, strings };
}

export async function translateSingleUiString(input: {
  key: string;
  targetLocale: string;
}) {
  if (input.targetLocale === UI_STRING_SOURCE_LOCALE) {
    throw new Error('ENGLISH_IS_DEFAULT_TEXT');
  }

  const [row] = await db.select().from(uiStrings).where(eq(uiStrings.key, input.key)).limit(1);
  if (!row) {
    return null;
  }

  const value = await translateText({
    text: row.defaultText,
    sourceLocale: UI_STRING_SOURCE_LOCALE,
    targetLocale: input.targetLocale,
    context: row.context ?? `UI string ${row.key}`,
  });

  return updateAdminUiStringTranslation({
    key: input.key,
    locale: input.targetLocale,
    value,
    source: 'llm',
  });
}
