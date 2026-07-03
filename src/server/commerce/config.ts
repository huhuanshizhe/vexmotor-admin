import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import {
  cloneCommerceConfig,
  defaultCommerceConfig,
  type CommerceConfig,
  type ShippingCountryRateConfig,
  type VolumePricingRuleConfig,
} from '@/lib/commerce-config';
import { normalizeShippingCountryRateConfig } from '@/lib/commerce-shipping-rate';
import { validateShippingRateScope } from '@/lib/shipping-rate-uniqueness';
import { validateVolumePricingDiscountPercent, validateVolumePricingMinQuantity, MIN_VOLUME_PRICING_QUANTITY } from '@/lib/volume-discount';
import { getExchangeRateSnapshot } from '@/server/admin/exchange-rate-snapshot';
import { getResolvedShippingMethods, getShippingMethodCodes } from '@/server/admin/shipping-methods';
import { db } from '@/server/db';
import { commerceSettings } from '@/server/db/schema';
import { getCountryContinentByIso } from '@/server/geo/country-continents';
import { getSiteSettings } from '@/server/site/settings';

const COMMERCE_SETTINGS_ROW_ID = 'default';

export type StorefrontCommerceConfig = CommerceConfig & {
  /** @deprecated Read from GET /api/front/site-settings instead */
  currencyCode: string;
  /** @deprecated Read from GET /api/front/site-settings instead */
  defaultCountryCode: string;
  exchangeRateSnapshot: Awaited<ReturnType<typeof getExchangeRateSnapshot>>;
  countryContinentByIso: Awaited<ReturnType<typeof getCountryContinentByIso>>;
};

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeMethodCode(value: string | null | undefined, fallback: string) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function normalizeVolumePricingRule(rule: VolumePricingRuleConfig): VolumePricingRuleConfig | null {
  const minQuantity = Math.max(MIN_VOLUME_PRICING_QUANTITY, Math.trunc(Number(rule.minQuantity) || MIN_VOLUME_PRICING_QUANTITY));
  const priceFactor = Number.isFinite(Number(rule.priceFactor)) ? Number(rule.priceFactor) : 1;
  const discountPercent = (1 - priceFactor) * 100;
  const discountValidation = validateVolumePricingDiscountPercent(discountPercent);
  if (!discountValidation.ok) {
    return null;
  }

  if (minQuantity < MIN_VOLUME_PRICING_QUANTITY) {
    return null;
  }

  return {
    id: sanitizeText(rule.id) ?? randomUUID(),
    label: sanitizeText(rule.label) ?? `Tier ${minQuantity}`,
    minQuantity,
    priceFactor: Number(Math.min(Math.max(priceFactor, 0.01), 1).toFixed(4)),
    note: sanitizeText(rule.note),
    enabled: rule.enabled !== false,
  };
}

function dedupeVolumePricingRules(rules: VolumePricingRuleConfig[]) {
  const result: VolumePricingRuleConfig[] = [];
  for (const rule of rules) {
    const normalized = normalizeVolumePricingRule(rule);
    if (!normalized) continue;
    const validation = validateVolumePricingMinQuantity(result, {
      minQuantity: normalized.minQuantity,
    });
    if (validation.ok) {
      result.push(normalized);
    }
  }
  return result.sort((left, right) => left.minQuantity - right.minQuantity || left.label.localeCompare(right.label));
}

function normalizeShippingCountryRate(
  rate: ShippingCountryRateConfig,
  methodCodes: Set<string>,
): ShippingCountryRateConfig | null {
  const shippingMethodCode = normalizeMethodCode(rate.shippingMethodCode, '');
  if (!shippingMethodCode || !methodCodes.has(shippingMethodCode)) {
    return null;
  }

  const numericRate = Number.isFinite(Number(rate.rate)) ? Number(rate.rate) : 0;
  const numericFreeShippingThreshold = rate.freeShippingThreshold == null ? null : Number(rate.freeShippingThreshold);
  const numericTaxRate = Number.isFinite(Number(rate.taxRate)) ? Number(rate.taxRate) : 0;

  return normalizeShippingCountryRateConfig({
    ...rate,
    id: sanitizeText(rate.id) ?? randomUUID(),
    shippingMethodCode,
    rate: Number(Math.max(0, numericRate).toFixed(2)),
    freeShippingThreshold:
      numericFreeShippingThreshold == null || Number.isNaN(numericFreeShippingThreshold)
        ? null
        : Number(Math.max(0, numericFreeShippingThreshold).toFixed(2)),
    taxRate: Number(Math.min(Math.max(numericTaxRate, 0), 1).toFixed(4)),
    enabled: rate.enabled !== false,
    note: sanitizeText(rate.note),
  });
}

function dedupeShippingRates(rates: ShippingCountryRateConfig[]) {
  const result: ShippingCountryRateConfig[] = [];
  for (const rate of rates) {
    const validation = validateShippingRateScope(result, {
      shippingMethodCode: rate.shippingMethodCode,
      regionCode: rate.regionCode,
      countryIsoCode: rate.countryIsoCode,
    });
    if (validation.ok) {
      result.push(rate);
    }
  }
  return result;
}

async function sanitizeCommerceConfig(input: Omit<CommerceConfig, 'shippingMethods'>, methodCodes: Set<string>): Promise<CommerceConfig> {
  const volumePricingRules = dedupeVolumePricingRules(input.volumePricingRules);
  const normalizedVolumePricingRules = volumePricingRules.length
    ? volumePricingRules
    : cloneCommerceConfig(defaultCommerceConfig).volumePricingRules;

  const shippingMethods = await getResolvedShippingMethods();
  const resolvedMethodCodes = new Set(shippingMethods.map((method) => method.code));
  const effectiveMethodCodes = methodCodes.size ? methodCodes : resolvedMethodCodes;

  const shippingCountryRates = dedupeShippingRates(
    input.shippingCountryRates
      .map((rate) => normalizeShippingCountryRate(rate, effectiveMethodCodes))
      .filter((rate): rate is ShippingCountryRateConfig => Boolean(rate))
      .sort(
        (left, right) =>
          left.regionCode.localeCompare(right.regionCode)
          || (left.countryIsoCode ?? '').localeCompare(right.countryIsoCode ?? '')
          || left.shippingMethodCode.localeCompare(right.shippingMethodCode),
      ),
  );
  const normalizedShippingCountryRates = shippingCountryRates.length
    ? shippingCountryRates
    : cloneCommerceConfig(defaultCommerceConfig).shippingCountryRates;

  const normalizedDefaultShippingMethodCode = normalizeMethodCode(input.defaultShippingMethodCode, '');
  const defaultShippingMethodCode = effectiveMethodCodes.has(normalizedDefaultShippingMethodCode)
    ? normalizedDefaultShippingMethodCode
    : shippingMethods[0]?.code ?? '';

  return {
    defaultShippingMethodCode,
    volumePricingRules: normalizedVolumePricingRules,
    shippingMethods,
    shippingCountryRates: normalizedShippingCountryRates,
  };
}

async function mapDbConfig(row: {
  defaultShippingMethodCode: string;
  volumePricingRules: VolumePricingRuleConfig[];
  shippingCountryRates: ShippingCountryRateConfig[];
}, locale?: string) {
  const shippingMethods = await getResolvedShippingMethods(locale);
  return sanitizeCommerceConfig({
    defaultShippingMethodCode: row.defaultShippingMethodCode,
    volumePricingRules: row.volumePricingRules,
    shippingCountryRates: row.shippingCountryRates,
  }, new Set(shippingMethods.map((method) => method.code)));
}

async function ensureCommerceConfig(locale?: string) {
  const [row] = await db.select().from(commerceSettings).where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID)).limit(1);
  if (row) {
    return mapDbConfig(row, locale);
  }

  const seeded = await mapDbConfig({
    defaultShippingMethodCode: defaultCommerceConfig.defaultShippingMethodCode,
    volumePricingRules: cloneCommerceConfig(defaultCommerceConfig).volumePricingRules,
    shippingCountryRates: cloneCommerceConfig(defaultCommerceConfig).shippingCountryRates,
  }, locale);

  await db.insert(commerceSettings).values({
    id: COMMERCE_SETTINGS_ROW_ID,
    defaultShippingMethodCode: seeded.defaultShippingMethodCode,
    volumePricingRules: seeded.volumePricingRules,
    shippingCountryRates: seeded.shippingCountryRates,
    updatedAt: new Date(),
  });
  return seeded;
}

export async function getCommerceConfig(locale?: string) {
  const config = await ensureCommerceConfig(locale);
  return cloneCommerceConfig(config);
}

export async function getStorefrontCommerceConfig(locale?: string): Promise<StorefrontCommerceConfig> {
  const [config, siteSettings, exchangeRateSnapshot, countryContinentByIso] = await Promise.all([
    getCommerceConfig(locale),
    getSiteSettings(),
    getExchangeRateSnapshot(),
    getCountryContinentByIso(),
  ]);

  return {
    ...config,
    currencyCode: siteSettings.defaultCurrencyCode,
    defaultCountryCode: siteSettings.defaultCountryCode,
    exchangeRateSnapshot,
    countryContinentByIso,
  };
}

export async function updateCommerceConfig(input: Omit<CommerceConfig, 'shippingMethods'>) {
  const methodCodes = new Set(await getShippingMethodCodes());
  const normalized = await sanitizeCommerceConfig(input, methodCodes);
  const now = new Date();
  const [row] = await db
    .insert(commerceSettings)
    .values({
      id: COMMERCE_SETTINGS_ROW_ID,
      defaultShippingMethodCode: normalized.defaultShippingMethodCode,
      volumePricingRules: normalized.volumePricingRules,
      shippingCountryRates: normalized.shippingCountryRates,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: commerceSettings.id,
      set: {
        defaultShippingMethodCode: normalized.defaultShippingMethodCode,
        volumePricingRules: normalized.volumePricingRules,
        shippingCountryRates: normalized.shippingCountryRates,
        updatedAt: now,
      },
    })
    .returning();

  const saved = row ? await mapDbConfig(row) : normalized;
  return cloneCommerceConfig(saved);
}

export async function getAdminCommerceConfig() {
  return getCommerceConfig();
}

export async function updateAdminCommerceConfig(input: Omit<CommerceConfig, 'shippingMethods'> & { shippingMethods?: CommerceConfig['shippingMethods'] }) {
  const { shippingMethods: _ignored, ...rest } = input;
  return updateCommerceConfig(rest);
}
