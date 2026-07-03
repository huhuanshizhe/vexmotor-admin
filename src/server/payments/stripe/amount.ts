const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND']);

export function orderTotalToStripeAmount(totalAmount: string | number, currencyCode: string) {
  const numeric = Number(totalAmount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Invalid order total for payment');
  }

  const currency = currencyCode.trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(numeric);
  }

  return Math.round(numeric * 100);
}

export function stripeAmountMatchesOrder(intentAmount: number, orderTotal: string | number, currencyCode: string) {
  return intentAmount === orderTotalToStripeAmount(orderTotal, currencyCode);
}
