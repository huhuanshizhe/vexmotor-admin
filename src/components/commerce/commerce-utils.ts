import type { CommerceConfig } from '@/lib/commerce-config';
import { getShippingRegionFlatSelectOptions } from '@/lib/shipping-regions';

export function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatCommerceMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: currencyCode }).format(amount);
}

export function uniqueCountryOptions(config: CommerceConfig) {
  void config;
  return getShippingRegionFlatSelectOptions();
}

export function ratesForShippingMethod(config: CommerceConfig, shippingMethodCode: string) {
  return config.shippingCountryRates
    .filter((rate) => rate.shippingMethodCode === shippingMethodCode)
    .sort((left, right) => left.countryCode.localeCompare(right.countryCode));
}
