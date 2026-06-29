import { asc, eq } from 'drizzle-orm';

import {
  cloneExchangeRateConfig,
  DEFAULT_EXCHANGE_RATE_CONFIG,
  EXCHANGE_RATE_SETTINGS_ROW_ID,
  type ExchangeRateConfig,
} from '@/lib/exchange-rate-config';
import { db } from '@/server/db';
import { exchangeRates, exchangeRateSettings } from '@/server/db/schema';

export async function loadExchangeRateConfigForScript(): Promise<ExchangeRateConfig> {
  if (!db) throw new Error('DATABASE_URL is required');

  const [settingsRow] = await db
    .select()
    .from(exchangeRateSettings)
    .where(eq(exchangeRateSettings.id, EXCHANGE_RATE_SETTINGS_ROW_ID))
    .limit(1);

  if (!settingsRow) {
    const seeded = DEFAULT_EXCHANGE_RATE_CONFIG;
    const now = new Date();
    await db.insert(exchangeRateSettings).values({
      id: EXCHANGE_RATE_SETTINGS_ROW_ID,
      baseCurrencyCode: seeded.baseCurrencyCode,
      updatedAt: now,
    });
    if (seeded.rates.length) {
      await db.insert(exchangeRates).values(
        seeded.rates.map((row) => ({
          currencyCode: row.currencyCode,
          rateToBase: String(row.rateToBase),
          updatedAt: now,
        })),
      );
    }
    return cloneExchangeRateConfig(seeded);
  }

  const rateRows = await db
    .select()
    .from(exchangeRates)
    .orderBy(asc(exchangeRates.currencyCode));

  return cloneExchangeRateConfig({
    baseCurrencyCode: settingsRow.baseCurrencyCode,
    rates: rateRows.map((row) => ({
      currencyCode: row.currencyCode,
      rateToBase: Number(row.rateToBase),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}
