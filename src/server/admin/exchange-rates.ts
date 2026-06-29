import 'server-only';

import { asc, eq } from 'drizzle-orm';

import {
  cloneExchangeRateConfig,
  DEFAULT_EXCHANGE_RATE_CONFIG,
  EXCHANGE_RATE_SETTINGS_ROW_ID,
  type ExchangeRateConfig,
  type ExchangeRateRow,
} from '@/lib/exchange-rate-config';
import { db } from '@/server/db';
import { exchangeRates, exchangeRateSettings } from '@/server/db/schema';

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length === 3 ? normalized : DEFAULT_EXCHANGE_RATE_CONFIG.baseCurrencyCode;
}

function normalizeRateToBase(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(8));
}

function sanitizeExchangeRateConfig(input: ExchangeRateConfig): ExchangeRateConfig {
  const baseCurrencyCode = normalizeCurrencyCode(input.baseCurrencyCode);
  const seen = new Set<string>();
  const rates: ExchangeRateRow[] = [];

  for (const row of input.rates) {
    const currencyCode = normalizeCurrencyCode(row.currencyCode);
    if (currencyCode === baseCurrencyCode || seen.has(currencyCode)) continue;
    const rateToBase = normalizeRateToBase(row.rateToBase);
    if (rateToBase == null) continue;
    seen.add(currencyCode);
    rates.push({ currencyCode, rateToBase });
  }

  rates.sort((left, right) => left.currencyCode.localeCompare(right.currencyCode));

  return { baseCurrencyCode, rates };
}

async function ensureExchangeRateConfig() {
  const [settingsRow] = await db
    .select()
    .from(exchangeRateSettings)
    .where(eq(exchangeRateSettings.id, EXCHANGE_RATE_SETTINGS_ROW_ID))
    .limit(1);

  if (!settingsRow) {
    const seeded = sanitizeExchangeRateConfig(DEFAULT_EXCHANGE_RATE_CONFIG);
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
    return seeded;
  }

  const rateRows = await db
    .select()
    .from(exchangeRates)
    .orderBy(asc(exchangeRates.currencyCode));

  return sanitizeExchangeRateConfig({
    baseCurrencyCode: settingsRow.baseCurrencyCode,
    rates: rateRows.map((row) => ({
      currencyCode: row.currencyCode,
      rateToBase: Number(row.rateToBase),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

export async function getAdminExchangeRateConfig(): Promise<ExchangeRateConfig> {
  const config = await ensureExchangeRateConfig();
  return cloneExchangeRateConfig(config);
}

export async function updateAdminExchangeRateConfig(input: ExchangeRateConfig): Promise<ExchangeRateConfig> {
  const normalized = sanitizeExchangeRateConfig(input);
  const now = new Date();

  const [currentSettings] = await db
    .select()
    .from(exchangeRateSettings)
    .where(eq(exchangeRateSettings.id, EXCHANGE_RATE_SETTINGS_ROW_ID))
    .limit(1);

  const baseChanged = currentSettings
    && normalizeCurrencyCode(currentSettings.baseCurrencyCode) !== normalized.baseCurrencyCode;

  await db
    .insert(exchangeRateSettings)
    .values({
      id: EXCHANGE_RATE_SETTINGS_ROW_ID,
      baseCurrencyCode: normalized.baseCurrencyCode,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: exchangeRateSettings.id,
      set: {
        baseCurrencyCode: normalized.baseCurrencyCode,
        updatedAt: now,
      },
    });

  if (baseChanged) {
    await db.delete(exchangeRates);
  } else {
    const keepCodes = new Set(normalized.rates.map((row) => row.currencyCode));
    const existing = await db.select({ currencyCode: exchangeRates.currencyCode }).from(exchangeRates);
    const deleteCodes = existing
      .map((row) => row.currencyCode)
      .filter((code) => !keepCodes.has(code));
    for (const currencyCode of deleteCodes) {
      await db.delete(exchangeRates).where(eq(exchangeRates.currencyCode, currencyCode));
    }
  }

  for (const row of normalized.rates) {
    await db
      .insert(exchangeRates)
      .values({
        currencyCode: row.currencyCode,
        rateToBase: String(row.rateToBase),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: exchangeRates.currencyCode,
        set: {
          rateToBase: String(row.rateToBase),
          updatedAt: now,
        },
      });
  }

  return getAdminExchangeRateConfig();
}
