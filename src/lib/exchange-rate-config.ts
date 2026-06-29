export type ExchangeRateRow = {
  currencyCode: string;
  rateToBase: number;
  updatedAt?: string;
};

export type ExchangeRateConfig = {
  baseCurrencyCode: string;
  rates: ExchangeRateRow[];
};

export const EXCHANGE_RATE_SETTINGS_ROW_ID = 'default';

export const DEFAULT_EXCHANGE_RATE_CONFIG: ExchangeRateConfig = {
  baseCurrencyCode: 'USD',
  rates: [
    { currencyCode: 'EUR', rateToBase: 1.08 },
    { currencyCode: 'GBP', rateToBase: 1.27 },
    { currencyCode: 'JPY', rateToBase: 0.0067 },
    { currencyCode: 'CNY', rateToBase: 0.14 },
  ],
};

export function cloneExchangeRateConfig(config: ExchangeRateConfig): ExchangeRateConfig {
  return {
    baseCurrencyCode: config.baseCurrencyCode,
    rates: config.rates.map((row) => ({ ...row })),
  };
}
