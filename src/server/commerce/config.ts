import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import {
  cloneCommerceConfig,
  defaultCommerceConfig,
  normalizeCommerceCountryCode,
  type CommerceConfig,
  type ShippingCountryRateConfig,
  type ShippingMethodConfig,
  type VolumePricingRuleConfig,
} from '@/lib/commerce-config';
import { db } from '@/server/db';
import { commerceSettings } from '@/server/db/schema';

const COMMERCE_SETTINGS_ROW_ID = 'default';

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length === 3 ? normalized : defaultCommerceConfig.currencyCode;
}

function normalizeMethodCode(value: string | null | undefined, fallback: string) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function normalizeVolumePricingRule(rule: VolumePricingRuleConfig, index: number): VolumePricingRuleConfig {
  const minQuantity = Math.max(1, Math.trunc(Number(rule.minQuantity) || 1));
  const priceFactor = Number.isFinite(Number(rule.priceFactor)) ? Number(rule.priceFactor) : 1;

  return {
    id: sanitizeText(rule.id) ?? randomUUID(),
    label: sanitizeText(rule.label) ?? `Tier ${index + 1}`,
    minQuantity,
    priceFactor: Number(Math.min(Math.max(priceFactor, 0.01), 1).toFixed(4)),
    note: sanitizeText(rule.note),
    enabled: rule.enabled !== false,
  };
}

function normalizeShippingMethod(method: ShippingMethodConfig, index: number): ShippingMethodConfig {
  const name = sanitizeText(method.name) ?? `物流方式 ${index + 1}`;

  return {
    id: sanitizeText(method.id) ?? randomUUID(),
    code: normalizeMethodCode(method.code || name, `method-${index + 1}`),
    name,
    etaLabel: sanitizeText(method.etaLabel) ?? '待配置',
    note: sanitizeText(method.note) ?? '请在后台补充该物流方式的适用说明。',
    enabled: method.enabled !== false,
    sortOrder: Math.max(0, Math.trunc(Number(method.sortOrder) || 0)),
  };
}

function normalizeShippingCountryRate(
  rate: ShippingCountryRateConfig,
  index: number,
  methodCodes: Set<string>,
): ShippingCountryRateConfig | null {
  const shippingMethodCode = normalizeMethodCode(rate.shippingMethodCode, '');
  if (!shippingMethodCode || !methodCodes.has(shippingMethodCode)) {
    return null;
  }

  const countryCode = normalizeCommerceCountryCode(rate.countryCode || defaultCommerceConfig.defaultCountryCode);
  const numericRate = Number.isFinite(Number(rate.rate)) ? Number(rate.rate) : 0;
  const numericFreeShippingThreshold = rate.freeShippingThreshold == null ? null : Number(rate.freeShippingThreshold);
  const numericTaxRate = Number.isFinite(Number(rate.taxRate)) ? Number(rate.taxRate) : 0;

  return {
    id: sanitizeText(rate.id) ?? randomUUID(),
    countryCode,
    countryName: sanitizeText(rate.countryName) ?? countryCode,
    shippingMethodCode,
    rate: Number(Math.max(0, numericRate).toFixed(2)),
    freeShippingThreshold:
      numericFreeShippingThreshold == null || Number.isNaN(numericFreeShippingThreshold)
        ? null
        : Number(Math.max(0, numericFreeShippingThreshold).toFixed(2)),
    taxRate: Number(Math.min(Math.max(numericTaxRate, 0), 1).toFixed(4)),
    enabled: rate.enabled !== false,
    note: sanitizeText(rate.note),
  };
}

function sanitizeCommerceConfig(input: CommerceConfig): CommerceConfig {
  const volumePricingRules = input.volumePricingRules.map(normalizeVolumePricingRule).sort((left, right) => left.minQuantity - right.minQuantity || left.label.localeCompare(right.label));
  const normalizedVolumePricingRules = volumePricingRules.length
    ? volumePricingRules
    : cloneCommerceConfig(defaultCommerceConfig).volumePricingRules;

  const shippingMethods = input.shippingMethods.map(normalizeShippingMethod).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const normalizedShippingMethods = shippingMethods.length ? shippingMethods : cloneCommerceConfig(defaultCommerceConfig).shippingMethods;
  const methodCodes = new Set(normalizedShippingMethods.map((method) => method.code));

  const shippingCountryRates = input.shippingCountryRates
    .map((rate, index) => normalizeShippingCountryRate(rate, index, methodCodes))
    .filter((rate): rate is ShippingCountryRateConfig => Boolean(rate))
    .sort(
      (left, right) =>
        left.countryCode.localeCompare(right.countryCode) ||
        left.shippingMethodCode.localeCompare(right.shippingMethodCode) ||
        left.countryName.localeCompare(right.countryName),
    );
  const normalizedShippingCountryRates = shippingCountryRates.length
    ? shippingCountryRates
    : cloneCommerceConfig(defaultCommerceConfig).shippingCountryRates;

  const availableCountryCodes = new Set(normalizedShippingCountryRates.map((rate) => normalizeCommerceCountryCode(rate.countryCode)));
  const normalizedDefaultCountryCode = normalizeCommerceCountryCode(input.defaultCountryCode || defaultCommerceConfig.defaultCountryCode);
  const defaultCountryCode = availableCountryCodes.has(normalizedDefaultCountryCode)
    ? normalizedDefaultCountryCode
    : normalizeCommerceCountryCode(normalizedShippingCountryRates[0]?.countryCode || defaultCommerceConfig.defaultCountryCode);

  const normalizedDefaultShippingMethodCode = normalizeMethodCode(input.defaultShippingMethodCode, '');
  const defaultShippingMethodCode = methodCodes.has(normalizedDefaultShippingMethodCode)
    ? normalizedDefaultShippingMethodCode
    : normalizedShippingMethods[0]?.code || defaultCommerceConfig.defaultShippingMethodCode;

  return {
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    defaultCountryCode,
    defaultShippingMethodCode,
    volumePricingRules: normalizedVolumePricingRules,
    shippingMethods: normalizedShippingMethods,
    shippingCountryRates: normalizedShippingCountryRates,
  };
}

function mapDbConfig(row: {
  currencyCode: string;
  defaultCountryCode: string;
  defaultShippingMethodCode: string;
  volumePricingRules: VolumePricingRuleConfig[];
  shippingMethods: ShippingMethodConfig[];
  shippingCountryRates: ShippingCountryRateConfig[];
}) {
  return sanitizeCommerceConfig({
    currencyCode: row.currencyCode,
    defaultCountryCode: row.defaultCountryCode,
    defaultShippingMethodCode: row.defaultShippingMethodCode,
    volumePricingRules: row.volumePricingRules,
    shippingMethods: row.shippingMethods,
    shippingCountryRates: row.shippingCountryRates,
  });
}

async function ensureCommerceConfig() {
  const [row] = await db.select().from(commerceSettings).where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID)).limit(1);
  if (row) {
    return mapDbConfig(row);
  }

  const seeded = sanitizeCommerceConfig(cloneCommerceConfig(defaultCommerceConfig));
  await db.insert(commerceSettings).values({
    id: COMMERCE_SETTINGS_ROW_ID,
    currencyCode: seeded.currencyCode,
    defaultCountryCode: seeded.defaultCountryCode,
    defaultShippingMethodCode: seeded.defaultShippingMethodCode,
    volumePricingRules: seeded.volumePricingRules,
    shippingMethods: seeded.shippingMethods,
    shippingCountryRates: seeded.shippingCountryRates,
    updatedAt: new Date(),
  });
  return seeded;
}

export async function getCommerceConfig() {
  const config = await ensureCommerceConfig();
  return cloneCommerceConfig(config);
}

export async function updateCommerceConfig(input: CommerceConfig) {
  const normalized = sanitizeCommerceConfig(input);
  const now = new Date();
  const [row] = await db
    .insert(commerceSettings)
    .values({
      id: COMMERCE_SETTINGS_ROW_ID,
      currencyCode: normalized.currencyCode,
      defaultCountryCode: normalized.defaultCountryCode,
      defaultShippingMethodCode: normalized.defaultShippingMethodCode,
      volumePricingRules: normalized.volumePricingRules,
      shippingMethods: normalized.shippingMethods,
      shippingCountryRates: normalized.shippingCountryRates,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: commerceSettings.id,
      set: {
        currencyCode: normalized.currencyCode,
        defaultCountryCode: normalized.defaultCountryCode,
        defaultShippingMethodCode: normalized.defaultShippingMethodCode,
        volumePricingRules: normalized.volumePricingRules,
        shippingMethods: normalized.shippingMethods,
        shippingCountryRates: normalized.shippingCountryRates,
        updatedAt: now,
      },
    })
    .returning();

  const saved = row ? mapDbConfig(row) : normalized;
  return cloneCommerceConfig(saved);
}

export async function getAdminCommerceConfig() {
  return getCommerceConfig();
}

export async function updateAdminCommerceConfig(input: CommerceConfig) {
  return updateCommerceConfig(input);
}