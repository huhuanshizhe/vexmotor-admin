import 'server-only';

import { eq } from 'drizzle-orm';

import { defaultPromotionSettings, type PromotionSettings } from '@/lib/promotion-settings';
import { db } from '@/server/db';
import { promotionSettings } from '@/server/db/schema';

const PROMOTION_SETTINGS_ROW_ID = 'default';

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length === 3 ? normalized : defaultPromotionSettings.defaultCurrencyCode;
}

export async function getPromotionSettings(): Promise<PromotionSettings> {
  const [row] = await db
    .select({
      defaultCurrencyCode: promotionSettings.defaultCurrencyCode,
    })
    .from(promotionSettings)
    .where(eq(promotionSettings.id, PROMOTION_SETTINGS_ROW_ID))
    .limit(1);

  if (!row) {
    return defaultPromotionSettings;
  }

  return {
    defaultCurrencyCode: normalizeCurrencyCode(row.defaultCurrencyCode),
  };
}

export async function updatePromotionSettings(input: PromotionSettings): Promise<PromotionSettings> {
  const next: PromotionSettings = {
    defaultCurrencyCode: normalizeCurrencyCode(input.defaultCurrencyCode),
  };

  await db
    .insert(promotionSettings)
    .values({
      id: PROMOTION_SETTINGS_ROW_ID,
      defaultCurrencyCode: next.defaultCurrencyCode,
    })
    .onConflictDoUpdate({
      target: promotionSettings.id,
      set: {
        defaultCurrencyCode: next.defaultCurrencyCode,
        updatedAt: new Date(),
      },
    });

  return next;
}
