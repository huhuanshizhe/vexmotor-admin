import type { ShippingContinentCode } from '@/lib/shipping-continents';
import { getShippingContinent, migrateLegacyRegionCode } from '@/lib/shipping-continents';
import { MIN_VOLUME_PRICING_QUANTITY } from '@/lib/volume-discount';

export type VolumePricingRuleConfig = {
  id: string;
  label: string;
  minQuantity: number;
  priceFactor: number;
  note: string | null;
  enabled: boolean;
};

export type ShippingMethodConfig = {
  id: string;
  code: string;
  name: string;
  etaLabel: string;
  note: string;
  enabled: boolean;
  sortOrder: number;
};

export type ShippingCountryRateConfig = {
  id: string;
  regionCode: ShippingContinentCode;
  countryIsoCode: string | null;
  regionName: string;
  countryName: string | null;
  /** 前台运费匹配兼容字段，本期仍按国家 ISO 或 OTHER 写入 */
  countryCode: string;
  shippingMethodCode: string;
  rate: number;
  freeShippingThreshold: number | null;
  taxRate: number;
  enabled: boolean;
  note: string | null;
};

export type CommerceConfig = {
  currencyCode: string;
  defaultCountryCode: string;
  defaultShippingMethodCode: string;
  volumePricingRules: VolumePricingRuleConfig[];
  shippingMethods: ShippingMethodConfig[];
  shippingCountryRates: ShippingCountryRateConfig[];
};

export type VolumePricingTier = {
  label: string;
  minQuantity: number;
  maxQuantity: number | null;
  rangeLabel: string;
  priceFactor: number;
  unitPriceAmount: number;
  unitPriceLabel: string;
  savingsPercent: number;
  note: string | null;
};

export type StorefrontShippingOption = {
  id: string;
  methodCode: string;
  carrier: string;
  title: string;
  eta: string;
  note: string;
  price: number;
  baseRate: number;
  countryCode: string;
  countryName: string;
  freeShippingThreshold: number | null;
  taxRate: number;
};

function buildDefaultShippingRate(input: {
  id: string;
  legacyCode: string;
  countryName: string;
  shippingMethodCode: string;
  rate: number;
  freeShippingThreshold: number | null;
  taxRate: number;
  enabled?: boolean;
  note: string | null;
}): ShippingCountryRateConfig {
  const migrated = migrateLegacyRegionCode(input.legacyCode);
  const region = getShippingContinent(migrated.regionCode);
  return {
    id: input.id,
    regionCode: migrated.regionCode,
    countryIsoCode: migrated.countryIsoCode,
    regionName: region?.name ?? migrated.regionCode,
    countryName: migrated.countryIsoCode ? input.countryName : null,
    countryCode: input.legacyCode,
    shippingMethodCode: input.shippingMethodCode,
    rate: input.rate,
    freeShippingThreshold: input.freeShippingThreshold,
    taxRate: input.taxRate,
    enabled: input.enabled ?? true,
    note: input.note,
  };
}

export const defaultCommerceConfig: CommerceConfig = {
  currencyCode: 'USD',
  defaultCountryCode: 'US',
  defaultShippingMethodCode: 'dhl-express',
  volumePricingRules: [
    { id: 'tier-2', label: 'Tier 5', minQuantity: 5, priceFactor: 0.96, note: '适合小批量补货与试产。', enabled: true },
    { id: 'tier-3', label: 'Tier 10', minQuantity: 10, priceFactor: 0.93, note: '适合重复采购与工程项目。', enabled: true },
    { id: 'tier-4', label: 'Tier 50', minQuantity: 50, priceFactor: 0.9, note: '适合项目批量与区域库存补货。', enabled: true },
    { id: 'tier-5', label: 'Tier 100', minQuantity: 100, priceFactor: 0.87, note: '适合年度框架与持续放货计划。', enabled: true },
  ],
  shippingMethods: [],
  shippingCountryRates: [
    buildDefaultShippingRate({ id: 'rate-us-dhl', legacyCode: 'US', countryName: 'United States', shippingMethodCode: 'dhl-express', rate: 26, freeShippingThreshold: 299, taxRate: 0.08, note: 'Primary express option for the United States.' }),
    buildDefaultShippingRate({ id: 'rate-us-fedex', legacyCode: 'US', countryName: 'United States', shippingMethodCode: 'fedex-priority', rate: 29, freeShippingThreshold: null, taxRate: 0.08, note: 'Suitable for North American business deliveries.' }),
    buildDefaultShippingRate({ id: 'rate-us-ups', legacyCode: 'US', countryName: 'United States', shippingMethodCode: 'ups-worldwide', rate: 32, freeShippingThreshold: null, taxRate: 0.08, note: null }),
    buildDefaultShippingRate({ id: 'rate-us-sea', legacyCode: 'US', countryName: 'United States', shippingMethodCode: 'sea-lcl', rate: 18, freeShippingThreshold: null, taxRate: 0.08, note: 'Lower-cost LCL option with extended transit time.' }),
    buildDefaultShippingRate({ id: 'rate-us-pickup', legacyCode: 'US', countryName: 'United States', shippingMethodCode: 'warehouse-pickup', rate: 0, freeShippingThreshold: null, taxRate: 0.08, note: 'No platform shipping fee for warehouse pickup.' }),
    buildDefaultShippingRate({ id: 'rate-de-dhl', legacyCode: 'DE', countryName: 'Germany', shippingMethodCode: 'dhl-express', rate: 32, freeShippingThreshold: 399, taxRate: 0.19, note: 'Primary express option for the European Union.' }),
    buildDefaultShippingRate({ id: 'rate-de-fedex', legacyCode: 'DE', countryName: 'Germany', shippingMethodCode: 'fedex-priority', rate: 36, freeShippingThreshold: null, taxRate: 0.19, note: null }),
    buildDefaultShippingRate({ id: 'rate-de-ups', legacyCode: 'DE', countryName: 'Germany', shippingMethodCode: 'ups-worldwide', rate: 39, freeShippingThreshold: null, taxRate: 0.19, note: null }),
    buildDefaultShippingRate({ id: 'rate-de-sea', legacyCode: 'DE', countryName: 'Germany', shippingMethodCode: 'sea-lcl', rate: 24, freeShippingThreshold: null, taxRate: 0.19, note: null }),
    buildDefaultShippingRate({ id: 'rate-gb-dhl', legacyCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'dhl-express', rate: 34, freeShippingThreshold: 399, taxRate: 0.2, note: null }),
    buildDefaultShippingRate({ id: 'rate-gb-fedex', legacyCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'fedex-priority', rate: 37, freeShippingThreshold: null, taxRate: 0.2, note: null }),
    buildDefaultShippingRate({ id: 'rate-gb-ups', legacyCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'ups-worldwide', rate: 40, freeShippingThreshold: null, taxRate: 0.2, note: null }),
    buildDefaultShippingRate({ id: 'rate-ca-dhl', legacyCode: 'CA', countryName: 'Canada', shippingMethodCode: 'dhl-express', rate: 30, freeShippingThreshold: 349, taxRate: 0.13, note: null }),
    buildDefaultShippingRate({ id: 'rate-ca-fedex', legacyCode: 'CA', countryName: 'Canada', shippingMethodCode: 'fedex-priority', rate: 34, freeShippingThreshold: null, taxRate: 0.13, note: null }),
    buildDefaultShippingRate({ id: 'rate-ca-ups', legacyCode: 'CA', countryName: 'Canada', shippingMethodCode: 'ups-worldwide', rate: 36, freeShippingThreshold: null, taxRate: 0.13, note: null }),
    buildDefaultShippingRate({ id: 'rate-au-dhl', legacyCode: 'AU', countryName: 'Australia', shippingMethodCode: 'dhl-express', rate: 36, freeShippingThreshold: 429, taxRate: 0.1, note: null }),
    buildDefaultShippingRate({ id: 'rate-au-fedex', legacyCode: 'AU', countryName: 'Australia', shippingMethodCode: 'fedex-priority', rate: 39, freeShippingThreshold: null, taxRate: 0.1, note: null }),
    buildDefaultShippingRate({ id: 'rate-au-ups', legacyCode: 'AU', countryName: 'Australia', shippingMethodCode: 'ups-worldwide', rate: 42, freeShippingThreshold: null, taxRate: 0.1, note: null }),
    buildDefaultShippingRate({ id: 'rate-other-dhl', legacyCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'dhl-express', rate: 44, freeShippingThreshold: 499, taxRate: 0.08, note: 'Default export express lane.' }),
    buildDefaultShippingRate({ id: 'rate-other-fedex', legacyCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'fedex-priority', rate: 48, freeShippingThreshold: null, taxRate: 0.08, note: null }),
    buildDefaultShippingRate({ id: 'rate-other-ups', legacyCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'ups-worldwide', rate: 52, freeShippingThreshold: null, taxRate: 0.08, note: null }),
    buildDefaultShippingRate({ id: 'rate-other-sea', legacyCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'sea-lcl', rate: 28, freeShippingThreshold: null, taxRate: 0.08, note: null }),
    buildDefaultShippingRate({ id: 'rate-other-pickup', legacyCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'warehouse-pickup', rate: 0, freeShippingThreshold: null, taxRate: 0.08, note: 'No platform shipping fee for warehouse pickup.' }),
  ],
};

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function roundMoney(amount: number) {
  return Number(amount.toFixed(2));
}

function sortVolumePricingRules(rules: VolumePricingRuleConfig[]) {
  return [...rules].sort((left, right) => left.minQuantity - right.minQuantity || left.label.localeCompare(right.label));
}

function sortShippingMethods(methods: ShippingMethodConfig[]) {
  return [...methods].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function normalizeCommerceCountryCode(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();
  return normalized || defaultCommerceConfig.defaultCountryCode;
}

export function cloneCommerceConfig(config: CommerceConfig): CommerceConfig {
  return {
    currencyCode: config.currencyCode,
    defaultCountryCode: config.defaultCountryCode,
    defaultShippingMethodCode: config.defaultShippingMethodCode,
    volumePricingRules: config.volumePricingRules.map((rule) => ({ ...rule })),
    shippingMethods: config.shippingMethods.map((method) => ({ ...method })),
    shippingCountryRates: config.shippingCountryRates.map((rate) => ({ ...rate })),
  };
}

export function buildVolumePricingTiers(
  basePrice: number,
  currency = 'USD',
  rules: VolumePricingRuleConfig[] = defaultCommerceConfig.volumePricingRules,
): VolumePricingTier[] {
  const activeRules = sortVolumePricingRules(rules.filter((rule) => rule.enabled));
  const sourceRules = activeRules.length ? activeRules : sortVolumePricingRules(defaultCommerceConfig.volumePricingRules.filter((rule) => rule.enabled));

  return sourceRules.map((tier, index) => {
    const nextTier = sourceRules[index + 1];
    const unitPriceAmount = roundMoney(basePrice * tier.priceFactor);

    return {
      label: tier.label,
      minQuantity: tier.minQuantity,
      maxQuantity: nextTier ? nextTier.minQuantity - 1 : null,
      rangeLabel: nextTier ? `${tier.minQuantity}-${nextTier.minQuantity - 1}` : `${tier.minQuantity}+`,
      priceFactor: tier.priceFactor,
      unitPriceAmount,
      unitPriceLabel: formatMoney(unitPriceAmount, currency),
      savingsPercent: Math.round((1 - tier.priceFactor) * 100),
      note: tier.note,
    };
  });
}

export function getVolumePricingForQuantity(
  basePrice: number,
  currency: string,
  quantity: number,
  rules: VolumePricingRuleConfig[] = defaultCommerceConfig.volumePricingRules,
) {
  const tiers = buildVolumePricingTiers(basePrice, currency, rules);
  const normalizedQuantity = Math.max(1, quantity);

  if (!tiers.length) {
    return buildListPriceTier(basePrice, currency, MIN_VOLUME_PRICING_QUANTITY);
  }

  const applicableTier = tiers.reduce<VolumePricingTier | null>(
    (current, tier) => (normalizedQuantity >= tier.minQuantity ? tier : current),
    null,
  );

  if (!applicableTier || normalizedQuantity < tiers[0]!.minQuantity) {
    return buildListPriceTier(basePrice, currency, tiers[0]!.minQuantity);
  }

  return applicableTier;
}

function buildListPriceTier(basePrice: number, currency: string, firstTierMinQuantity: number): VolumePricingTier {
  const maxQuantity = Math.max(MIN_VOLUME_PRICING_QUANTITY, firstTierMinQuantity) - 1;
  return {
    label: 'List',
    minQuantity: 1,
    maxQuantity: maxQuantity >= 1 ? maxQuantity : null,
    rangeLabel: maxQuantity >= 1 ? `1-${maxQuantity}` : '1',
    priceFactor: 1,
    unitPriceAmount: roundMoney(basePrice),
    unitPriceLabel: formatMoney(basePrice, currency),
    savingsPercent: 0,
    note: null,
  };
}

export function getNextVolumeTier(
  basePrice: number,
  currency: string,
  quantity: number,
  rules: VolumePricingRuleConfig[] = defaultCommerceConfig.volumePricingRules,
) {
  const tiers = buildVolumePricingTiers(basePrice, currency, rules);
  const normalizedQuantity = Math.max(1, quantity);
  const nextTier = tiers.find((tier) => tier.minQuantity > normalizedQuantity);

  if (!nextTier) {
    return null;
  }

  return {
    ...nextTier,
    unitsToGo: nextTier.minQuantity - normalizedQuantity,
  };
}

export function getVolumePricingEstimate(
  basePrice: number,
  currency: string,
  quantity: number,
  rules: VolumePricingRuleConfig[] = defaultCommerceConfig.volumePricingRules,
) {
  const normalizedQuantity = Math.max(1, quantity);
  const applicableTier = getVolumePricingForQuantity(basePrice, currency, normalizedQuantity, rules);
  const listExtendedAmount = roundMoney(basePrice * normalizedQuantity);
  const tierExtendedAmount = roundMoney(applicableTier.unitPriceAmount * normalizedQuantity);
  const savingsAmount = roundMoney(listExtendedAmount - tierExtendedAmount);

  return {
    quantity: normalizedQuantity,
    applicableTier,
    listExtendedAmount,
    listExtendedLabel: formatMoney(listExtendedAmount, currency),
    tierExtendedAmount,
    tierExtendedLabel: formatMoney(tierExtendedAmount, currency),
    savingsAmount,
    savingsLabel: formatMoney(savingsAmount, currency),
    savingsPercent: listExtendedAmount > 0 ? Math.round((savingsAmount / listExtendedAmount) * 100) : 0,
  };
}

function getRatesForCountry(config: CommerceConfig, countryCode: string) {
  const normalizedCountryCode = normalizeCommerceCountryCode(countryCode);
  const exactRates = config.shippingCountryRates.filter((rate) => rate.enabled && normalizeCommerceCountryCode(rate.countryCode) === normalizedCountryCode);

  if (exactRates.length) {
    return exactRates;
  }

  return config.shippingCountryRates.filter((rate) => rate.enabled && normalizeCommerceCountryCode(rate.countryCode) === 'OTHER');
}

export function getShippingCountryOptions(config: CommerceConfig) {
  const seen = new Set<string>();

  return config.shippingCountryRates
    .filter((rate) => rate.enabled)
    .map((rate) => ({
      code: normalizeCommerceCountryCode(rate.countryCode),
      label: rate.countryName ?? rate.countryCode,
    }))
    .filter((country) => {
      if (seen.has(country.code)) {
        return false;
      }

      seen.add(country.code);
      return true;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getShippingOptions(
  config: CommerceConfig,
  countryCode: string,
  subtotal: number,
) {
  const methodByCode = new Map(sortShippingMethods(config.shippingMethods.filter((method) => method.enabled)).map((method) => [method.code, method]));

  return getRatesForCountry(config, countryCode)
    .map((rate) => {
      const method = methodByCode.get(rate.shippingMethodCode);
      if (!method) {
        return null;
      }

      const qualifiesForFreeShipping = rate.freeShippingThreshold != null && subtotal >= rate.freeShippingThreshold;
      const laneNote = method.note.trim() || rate.note || '';
      return {
        id: method.code,
        methodCode: method.code,
        carrier: method.name,
        title: method.name,
        eta: method.etaLabel,
        note: qualifiesForFreeShipping
          ? `Free shipping applied for orders over ${formatMoney(rate.freeShippingThreshold ?? 0, config.currencyCode)} on this lane.`
          : laneNote,
        price: qualifiesForFreeShipping ? 0 : roundMoney(rate.rate),
        baseRate: roundMoney(rate.rate),
        countryCode: normalizeCommerceCountryCode(rate.countryCode),
        countryName: rate.countryName ?? rate.countryCode,
        freeShippingThreshold: rate.freeShippingThreshold,
        taxRate: rate.taxRate,
      } satisfies StorefrontShippingOption;
    })
    .filter((option): option is StorefrontShippingOption => Boolean(option));
}

export function getEstimatedTaxRate(config: CommerceConfig, countryCode: string) {
  const rate = getRatesForCountry(config, countryCode)[0];
  return rate?.taxRate ?? 0;
}

export function getPrimaryShippingOption(config: CommerceConfig, countryCode: string, subtotal: number) {
  const options = getShippingOptions(config, countryCode, subtotal);

  return options.find((option) => option.methodCode === config.defaultShippingMethodCode) ?? options[0] ?? null;
}

export function calculateOrderPricing(
  config: CommerceConfig,
  input: {
    subtotal: number;
    discountAmount?: number;
    countryCode: string;
    shippingMethodCode?: string | null;
  },
) {
  const normalizedSubtotal = roundMoney(Math.max(0, input.subtotal));
  const normalizedDiscountAmount = roundMoney(Math.max(0, input.discountAmount ?? 0));
  const taxableSubtotal = roundMoney(Math.max(normalizedSubtotal - normalizedDiscountAmount, 0));
  const options = getShippingOptions(config, input.countryCode, normalizedSubtotal);
  const selectedShippingOption = options.find((option) => option.methodCode === input.shippingMethodCode) ?? getPrimaryShippingOption(config, input.countryCode, normalizedSubtotal);
  const shippingAmount = roundMoney(selectedShippingOption?.price ?? 0);
  const taxRate = selectedShippingOption?.taxRate ?? getEstimatedTaxRate(config, input.countryCode);
  const taxAmount = roundMoney(taxableSubtotal * taxRate);
  const totalAmount = roundMoney(taxableSubtotal + shippingAmount + taxAmount);
  const freeShippingThreshold = selectedShippingOption?.freeShippingThreshold ?? null;
  const remainingForFreeShipping = freeShippingThreshold == null ? 0 : roundMoney(Math.max(freeShippingThreshold - normalizedSubtotal, 0));

  return {
    shippingAmount,
    taxAmount,
    totalAmount,
    taxRate,
    taxableSubtotal,
    freeShippingThreshold,
    remainingForFreeShipping,
    selectedShippingOption,
    availableShippingOptions: options,
  };
}