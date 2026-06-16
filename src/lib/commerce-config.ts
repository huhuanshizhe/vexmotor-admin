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
  countryCode: string;
  countryName: string;
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

export const defaultCommerceConfig: CommerceConfig = {
  currencyCode: 'USD',
  defaultCountryCode: 'US',
  defaultShippingMethodCode: 'dhl-express',
  volumePricingRules: [
    { id: 'tier-1', label: 'Tier 1', minQuantity: 1, priceFactor: 1, note: '试样、备件与小批量验证订单。', enabled: true },
    { id: 'tier-2', label: 'Tier 2', minQuantity: 5, priceFactor: 0.96, note: '适合小批量补货与试产。', enabled: true },
    { id: 'tier-3', label: 'Tier 3', minQuantity: 10, priceFactor: 0.93, note: '适合重复采购与工程项目。', enabled: true },
    { id: 'tier-4', label: 'Tier 4', minQuantity: 50, priceFactor: 0.9, note: '适合项目批量与区域库存补货。', enabled: true },
    { id: 'tier-5', label: 'Tier 5', minQuantity: 100, priceFactor: 0.87, note: '适合年度框架与持续放货计划。', enabled: true },
  ],
  shippingMethods: [
    {
      id: 'method-1',
      code: 'dhl-express',
      name: 'DHL Express',
      etaLabel: '2-5 个工作日',
      note: '适合样品、急单与维保备件。',
      enabled: true,
      sortOrder: 1,
    },
    {
      id: 'method-2',
      code: 'fedex-priority',
      name: 'FedEx Priority',
      etaLabel: '3-6 个工作日',
      note: '适合需要更稳定清关可视性的国际商业件。',
      enabled: true,
      sortOrder: 2,
    },
    {
      id: 'method-3',
      code: 'ups-worldwide',
      name: 'UPS Worldwide',
      etaLabel: '3-7 个工作日',
      note: '适合已有 UPS 收货偏好的仓库与进口渠道。',
      enabled: true,
      sortOrder: 3,
    },
    {
      id: 'method-4',
      code: 'sea-lcl',
      name: 'Sea-LCL',
      etaLabel: '18-28 天',
      note: '适合较重货物与更关注到岸成本的补货场景。',
      enabled: true,
      sortOrder: 4,
    },
    {
      id: 'method-5',
      code: 'warehouse-pickup',
      name: 'Warehouse Pickup',
      etaLabel: '预约提货',
      note: '适合已安排货代或本地自提。',
      enabled: true,
      sortOrder: 5,
    },
  ],
  shippingCountryRates: [
    { id: 'rate-us-dhl', countryCode: 'US', countryName: 'United States', shippingMethodCode: 'dhl-express', rate: 26, freeShippingThreshold: 299, taxRate: 0.08, enabled: true, note: '美国主力快递方案。' },
    { id: 'rate-us-fedex', countryCode: 'US', countryName: 'United States', shippingMethodCode: 'fedex-priority', rate: 29, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: '适合北美商务交付。' },
    { id: 'rate-us-ups', countryCode: 'US', countryName: 'United States', shippingMethodCode: 'ups-worldwide', rate: 32, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: null },
    { id: 'rate-us-sea', countryCode: 'US', countryName: 'United States', shippingMethodCode: 'sea-lcl', rate: 18, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: '低时效拼箱方案。' },
    { id: 'rate-us-pickup', countryCode: 'US', countryName: 'United States', shippingMethodCode: 'warehouse-pickup', rate: 0, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: '自提不收取平台运费。' },
    { id: 'rate-de-dhl', countryCode: 'DE', countryName: 'Germany', shippingMethodCode: 'dhl-express', rate: 32, freeShippingThreshold: 399, taxRate: 0.19, enabled: true, note: '欧盟常用快递方案。' },
    { id: 'rate-de-fedex', countryCode: 'DE', countryName: 'Germany', shippingMethodCode: 'fedex-priority', rate: 36, freeShippingThreshold: null, taxRate: 0.19, enabled: true, note: null },
    { id: 'rate-de-ups', countryCode: 'DE', countryName: 'Germany', shippingMethodCode: 'ups-worldwide', rate: 39, freeShippingThreshold: null, taxRate: 0.19, enabled: true, note: null },
    { id: 'rate-de-sea', countryCode: 'DE', countryName: 'Germany', shippingMethodCode: 'sea-lcl', rate: 24, freeShippingThreshold: null, taxRate: 0.19, enabled: true, note: null },
    { id: 'rate-gb-dhl', countryCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'dhl-express', rate: 34, freeShippingThreshold: 399, taxRate: 0.2, enabled: true, note: null },
    { id: 'rate-gb-fedex', countryCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'fedex-priority', rate: 37, freeShippingThreshold: null, taxRate: 0.2, enabled: true, note: null },
    { id: 'rate-gb-ups', countryCode: 'GB', countryName: 'United Kingdom', shippingMethodCode: 'ups-worldwide', rate: 40, freeShippingThreshold: null, taxRate: 0.2, enabled: true, note: null },
    { id: 'rate-ca-dhl', countryCode: 'CA', countryName: 'Canada', shippingMethodCode: 'dhl-express', rate: 30, freeShippingThreshold: 349, taxRate: 0.13, enabled: true, note: null },
    { id: 'rate-ca-fedex', countryCode: 'CA', countryName: 'Canada', shippingMethodCode: 'fedex-priority', rate: 34, freeShippingThreshold: null, taxRate: 0.13, enabled: true, note: null },
    { id: 'rate-ca-ups', countryCode: 'CA', countryName: 'Canada', shippingMethodCode: 'ups-worldwide', rate: 36, freeShippingThreshold: null, taxRate: 0.13, enabled: true, note: null },
    { id: 'rate-au-dhl', countryCode: 'AU', countryName: 'Australia', shippingMethodCode: 'dhl-express', rate: 36, freeShippingThreshold: 429, taxRate: 0.1, enabled: true, note: null },
    { id: 'rate-au-fedex', countryCode: 'AU', countryName: 'Australia', shippingMethodCode: 'fedex-priority', rate: 39, freeShippingThreshold: null, taxRate: 0.1, enabled: true, note: null },
    { id: 'rate-au-ups', countryCode: 'AU', countryName: 'Australia', shippingMethodCode: 'ups-worldwide', rate: 42, freeShippingThreshold: null, taxRate: 0.1, enabled: true, note: null },
    { id: 'rate-other-dhl', countryCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'dhl-express', rate: 44, freeShippingThreshold: 499, taxRate: 0.08, enabled: true, note: '默认出口快递方案。' },
    { id: 'rate-other-fedex', countryCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'fedex-priority', rate: 48, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: null },
    { id: 'rate-other-ups', countryCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'ups-worldwide', rate: 52, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: null },
    { id: 'rate-other-sea', countryCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'sea-lcl', rate: 28, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: null },
    { id: 'rate-other-pickup', countryCode: 'OTHER', countryName: 'Other', shippingMethodCode: 'warehouse-pickup', rate: 0, freeShippingThreshold: null, taxRate: 0.08, enabled: true, note: '自提不收取平台运费。' },
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

  return tiers.reduce((current, tier) => (normalizedQuantity >= tier.minQuantity ? tier : current), tiers[0]!);
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
      label: rate.countryName,
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
      return {
        id: method.code,
        methodCode: method.code,
        carrier: method.name,
        title: method.name,
        eta: method.etaLabel,
        note: qualifiesForFreeShipping
          ? `已满足 ${formatMoney(rate.freeShippingThreshold ?? 0, config.currencyCode)} 免运门槛，当前线路运费为 0。`
          : rate.note ?? method.note,
        price: qualifiesForFreeShipping ? 0 : roundMoney(rate.rate),
        baseRate: roundMoney(rate.rate),
        countryCode: normalizeCommerceCountryCode(rate.countryCode),
        countryName: rate.countryName,
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