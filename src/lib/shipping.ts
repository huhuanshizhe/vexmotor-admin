import {
  defaultCommerceConfig,
  getEstimatedTaxRate as getEstimatedTaxRateFromConfig,
  getShippingCountryOptions as getShippingCountryOptionsFromConfig,
  getShippingOptions as getShippingOptionsFromConfig,
  type CommerceConfig,
  type CommercePricingContext,
  type StorefrontShippingOption,
} from '@/lib/commerce-config';

export const SHIPPING_FREE_THRESHOLD =
  defaultCommerceConfig.shippingCountryRates.find(
    (rate) => rate.countryCode === 'US' && rate.shippingMethodCode === defaultCommerceConfig.defaultShippingMethodCode,
  )?.freeShippingThreshold ?? 0;

export type ShippingCountryCode = string;

export type ShippingCountryOption = {
  code: string;
  label: string;
};

export type ShippingOption = StorefrontShippingOption;

export const SHIPPING_ESTIMATOR_COUNTRIES: ShippingCountryOption[] = getShippingCountryOptionsFromConfig(defaultCommerceConfig);

export function getShippingCountryOptions(config: CommerceConfig = defaultCommerceConfig) {
  return getShippingCountryOptionsFromConfig(config);
}

export function buildShippingOptions(
  countryCode: string,
  subtotal: number,
  config: CommerceConfig = defaultCommerceConfig,
  pricingContext: CommercePricingContext,
) {
  return getShippingOptionsFromConfig(config, countryCode, subtotal, pricingContext);
}

export function getEstimatedTaxRate(
  countryCode: string,
  countryContinentByIso: Record<string, string>,
  config: CommerceConfig = defaultCommerceConfig,
) {
  return getEstimatedTaxRateFromConfig(config, countryCode, countryContinentByIso);
}
