import type { ExchangeRateConfig } from '@/lib/exchange-rate-config';

export type ExchangeRateSnapshot = {
  baseCurrencyCode: string;
  ratesByCurrency: Record<string, number>;
};

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function buildSnapshotFromConfig(config: ExchangeRateConfig): ExchangeRateSnapshot {
  const baseCurrencyCode = normalizeCurrencyCode(config.baseCurrencyCode);
  const ratesByCurrency: Record<string, number> = {
    [baseCurrencyCode]: 1,
  };

  for (const row of config.rates) {
    const code = normalizeCurrencyCode(row.currencyCode);
    if (code === baseCurrencyCode) continue;
    if (Number.isFinite(row.rateToBase) && row.rateToBase > 0) {
      ratesByCurrency[code] = row.rateToBase;
    }
  }

  return { baseCurrencyCode, ratesByCurrency };
}

export function ceilToMoneyDecimals(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor) / factor;
}

function getRateToBase(currency: string, snapshot: ExchangeRateSnapshot): number | null {
  const code = normalizeCurrencyCode(currency);
  if (code === snapshot.baseCurrencyCode) return 1;
  const rate = snapshot.ratesByCurrency[code];
  return rate && rate > 0 ? rate : null;
}

export function convertViaBase(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  snapshot: ExchangeRateSnapshot,
): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return ceilToMoneyDecimals(amount);

  const fromRate = getRateToBase(from, snapshot);
  const toRate = getRateToBase(to, snapshot);
  if (fromRate == null || toRate == null) return null;

  return ceilToMoneyDecimals(amount * (fromRate / toRate));
}

export function isValidPositivePrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  snapshot: ExchangeRateSnapshot,
): number | null {
  return convertViaBase(amount, fromCurrency, toCurrency, snapshot);
}

export type ConvertedProductPrices = {
  price: number | null;
  compareAtPrice: number | null;
  currencyCode: string;
  missingRate?: string;
};

export function convertProductPrices(options: {
  price: number | null | undefined;
  compareAtPrice: number | null | undefined;
  fromCurrency: string;
  toCurrency: string;
  snapshot: ExchangeRateSnapshot;
}): ConvertedProductPrices {
  const from = normalizeCurrencyCode(options.fromCurrency);
  const to = normalizeCurrencyCode(options.toCurrency);

  if (from === to) {
    return {
      price: isValidPositivePrice(options.price) ? ceilToMoneyDecimals(options.price) : null,
      compareAtPrice: isValidPositivePrice(options.compareAtPrice)
        ? ceilToMoneyDecimals(options.compareAtPrice)
        : null,
      currencyCode: to,
    };
  }

  const fromRate = getRateToBase(from, options.snapshot);
  const toRate = getRateToBase(to, options.snapshot);
  if (fromRate == null || toRate == null) {
    return {
      price: null,
      compareAtPrice: null,
      currencyCode: to,
      missingRate: `${from}→${to}`,
    };
  }

  return {
    price: isValidPositivePrice(options.price)
      ? convertViaBase(options.price, from, to, options.snapshot)
      : null,
    compareAtPrice: isValidPositivePrice(options.compareAtPrice)
      ? convertViaBase(options.compareAtPrice, from, to, options.snapshot)
      : null,
    currencyCode: to,
  };
}
