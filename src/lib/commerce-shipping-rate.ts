import type { ShippingContinentCode } from '@/lib/shipping-continents';
import {
  getShippingContinent,
  getShippingContinentLabel,
  isShippingContinentCode,
  migrateLegacyRegionCode,
} from '@/lib/shipping-continents';
import type { ShippingCountryRateConfig } from '@/lib/commerce-config';
import { getCommonCurrency } from '@/lib/currencies';

export type ShippingCountryRateConfigInput = Partial<ShippingCountryRateConfig> & {
  id: string;
  shippingMethodCode: string;
  rate: number;
};

export function normalizeShippingCountryRateConfig(
  input: ShippingCountryRateConfigInput,
): ShippingCountryRateConfig {
  const legacyCountryCode = input.countryCode?.trim().toUpperCase() ?? '';
  const migrated = !input.regionCode && legacyCountryCode
    ? migrateLegacyRegionCode(legacyCountryCode)
    : null;

  const regionCode = (input.regionCode && isShippingContinentCode(input.regionCode)
    ? input.regionCode
    : migrated?.regionCode) ?? 'OTHER';

  const countryIsoCode = input.countryIsoCode === undefined
    ? (migrated?.countryIsoCode ?? (legacyCountryCode && legacyCountryCode !== 'OTHER' ? legacyCountryCode : null))
    : (input.countryIsoCode?.trim().toUpperCase() || null);

  const region = getShippingContinent(regionCode);
  const regionName = input.regionName?.trim() || region?.name || regionCode;
  const countryName = input.countryName?.trim() || null;

  const storefrontCountryCode = countryIsoCode ?? (regionCode === 'OTHER' ? 'OTHER' : legacyCountryCode || regionCode);
  const currencyCode = getCommonCurrency(input.currencyCode?.trim().toUpperCase() ?? 'USD')?.code ?? 'USD';

  return {
    id: input.id,
    regionCode,
    countryIsoCode,
    regionName,
    countryName,
    countryCode: storefrontCountryCode,
    shippingMethodCode: input.shippingMethodCode,
    currencyCode,
    rate: input.rate,
    freeShippingThreshold: input.freeShippingThreshold ?? null,
    taxRate: input.taxRate ?? 0,
    enabled: input.enabled !== false,
    note: input.note ?? null,
  };
}

export function getShippingRateDisplayLabel(rate: Pick<ShippingCountryRateConfig, 'regionCode' | 'countryIsoCode' | 'countryName' | 'regionName'>) {
  const regionLabel = getShippingContinentLabel(rate.regionCode);
  if (!rate.countryIsoCode) {
    return regionLabel;
  }
  const countryLabel = rate.countryName
    ? `${rate.countryName} (${rate.countryIsoCode})`
    : rate.countryIsoCode;
  return `${regionLabel} / ${countryLabel}`;
}

export function getShippingRateChipLabel(rate: Pick<ShippingCountryRateConfig, 'regionCode' | 'countryIsoCode'>) {
  const region = getShippingContinent(rate.regionCode);
  const regionShort = region?.shortCode ?? rate.regionCode;
  return rate.countryIsoCode ? `${regionShort}/${rate.countryIsoCode}` : regionShort;
}

function normalizeCountryCode(countryCode: string) {
  return countryCode.trim().toUpperCase();
}

function rateMatchesExactCountry(rate: ShippingCountryRateConfig, normalizedCountryCode: string) {
  if (!rate.enabled) {
    return false;
  }

  if (rate.countryIsoCode && normalizeCountryCode(rate.countryIsoCode) === normalizedCountryCode) {
    return true;
  }

  return normalizeCountryCode(rate.countryCode) === normalizedCountryCode;
}

function rateMatchesContinent(rate: ShippingCountryRateConfig, continentCode: string) {
  if (!rate.enabled || rate.countryIsoCode) {
    return false;
  }

  return rate.regionCode === continentCode || normalizeCountryCode(rate.countryCode) === continentCode;
}

export function resolveShippingRatesForCountry(
  rates: ShippingCountryRateConfig[],
  countryCode: string,
  countryContinentByIso: Record<string, string>,
): ShippingCountryRateConfig[] {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) {
    return [];
  }

  const exactRates = rates.filter((rate) => rateMatchesExactCountry(rate, normalizedCountryCode));
  if (exactRates.length) {
    return exactRates;
  }

  const continentCode = countryContinentByIso[normalizedCountryCode];
  if (continentCode) {
    const regionRates = rates.filter((rate) => rateMatchesContinent(rate, continentCode));
    if (regionRates.length) {
      return regionRates;
    }
  }

  return rates.filter(
    (rate) => rate.enabled && (rate.regionCode === 'OTHER' || normalizeCountryCode(rate.countryCode) === 'OTHER'),
  );
}
