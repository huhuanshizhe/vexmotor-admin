import { getMarketDefaults, normalizeLocale } from '@/lib/i18n';

type OrderCurrencyInput = {
  currencyCode?: string | null;
  locale?: string | null;
};

/** Resolve the charge/display currency for an order (handles legacy USD rows with locale-priced totals). */
export function resolveOrderCurrencyCode(order: OrderCurrencyInput) {
  const stored = order.currencyCode?.trim().toUpperCase() || 'USD';
  const orderLocale = normalizeLocale(order.locale);
  const marketCurrency = getMarketDefaults(orderLocale).currency;

  if (stored === 'USD' && orderLocale !== 'en' && marketCurrency !== 'USD') {
    return marketCurrency;
  }

  return stored;
}
