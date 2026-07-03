import 'server-only';

import { eq } from 'drizzle-orm';

import { getCommonCurrency } from '@/lib/currencies';
import { cloneSiteSettings, defaultSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { normalizeCommerceCountryCode } from '@/lib/commerce-config';
import { db } from '@/server/db';
import { siteSettings } from '@/server/db/schema';

const SITE_SETTINGS_ROW_ID = 'default';

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || !getCommonCurrency(normalized)) {
    return defaultSiteSettings.defaultCurrencyCode;
  }
  return normalized;
}

async function mapDbRow(row: typeof siteSettings.$inferSelect): Promise<SiteSettings> {
  return {
    defaultCurrencyCode: normalizeCurrencyCode(row.defaultCurrencyCode),
    defaultCountryCode: normalizeCommerceCountryCode(row.defaultCountryCode),
    extra: row.extra ?? {},
  };
}

async function ensureSiteSettingsRow() {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, SITE_SETTINGS_ROW_ID)).limit(1);
  if (row) {
    return mapDbRow(row);
  }

  const seeded = cloneSiteSettings(defaultSiteSettings);
  await db.insert(siteSettings).values({
    id: SITE_SETTINGS_ROW_ID,
    defaultCurrencyCode: seeded.defaultCurrencyCode,
    defaultCountryCode: seeded.defaultCountryCode,
    extra: seeded.extra ?? {},
    updatedAt: new Date(),
  });
  return seeded;
}

export async function getSiteSettings() {
  const settings = await ensureSiteSettingsRow();
  return cloneSiteSettings(settings);
}

export async function updateSiteSettings(input: SiteSettings) {
  const normalized: SiteSettings = {
    defaultCurrencyCode: normalizeCurrencyCode(input.defaultCurrencyCode),
    defaultCountryCode: normalizeCommerceCountryCode(input.defaultCountryCode),
    extra: input.extra ?? {},
  };
  const now = new Date();

  const [row] = await db
    .insert(siteSettings)
    .values({
      id: SITE_SETTINGS_ROW_ID,
      defaultCurrencyCode: normalized.defaultCurrencyCode,
      defaultCountryCode: normalized.defaultCountryCode,
      extra: normalized.extra ?? {},
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        defaultCurrencyCode: normalized.defaultCurrencyCode,
        defaultCountryCode: normalized.defaultCountryCode,
        extra: normalized.extra ?? {},
        updatedAt: now,
      },
    })
    .returning();

  return row ? mapDbRow(row) : normalized;
}
