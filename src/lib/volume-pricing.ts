import {
  buildVolumePricingTiers as buildVolumePricingTiersFromConfig,
  getNextVolumeTier as getNextVolumeTierFromConfig,
  getVolumePricingEstimate as getVolumePricingEstimateFromConfig,
  getVolumePricingForQuantity as getVolumePricingForQuantityFromConfig,
  type VolumePricingRuleConfig,
  type VolumePricingTier,
} from '@/lib/commerce-config';

export const volumePricingIllustrationBands = [
  {
    rangeLabel: '1-9 pcs',
    headline: 'Starter and pilot demand',
    note: 'Single build, validation, and urgent maintenance orders usually start here before formal annual planning begins.',
  },
  {
    rangeLabel: '10-49 pcs',
    headline: 'Published web tier review',
    note: 'Repeat demand begins to unlock public web discounts. Exact breaks still vary by SKU family and bundle scope.',
  },
  {
    rangeLabel: '50-199 pcs',
    headline: 'Program volume',
    note: 'Use this band when one motor family is forecast across pilot, regional warehouse, or multi-line machine programs.',
  },
  {
    rangeLabel: '200+ pcs',
    headline: 'Contract lane',
    note: 'Annual agreements can add reserved stock, scheduled releases, and commercial review beyond the published web tier.',
  },
] as const;

export type { VolumePricingTier };

export function buildVolumePricingTiers(basePrice: number, currency = 'USD', rules?: VolumePricingRuleConfig[]) {
  return buildVolumePricingTiersFromConfig(basePrice, currency, rules);
}

export function getVolumePricingForQuantity(basePrice: number, currency: string, quantity: number, rules?: VolumePricingRuleConfig[]) {
  return getVolumePricingForQuantityFromConfig(basePrice, currency, quantity, rules);
}

export function getNextVolumeTier(basePrice: number, currency: string, quantity: number, rules?: VolumePricingRuleConfig[]) {
  return getNextVolumeTierFromConfig(basePrice, currency, quantity, rules);
}

export function getVolumePricingEstimate(basePrice: number, currency: string, quantity: number, rules?: VolumePricingRuleConfig[]) {
  return getVolumePricingEstimateFromConfig(basePrice, currency, quantity, rules);
}