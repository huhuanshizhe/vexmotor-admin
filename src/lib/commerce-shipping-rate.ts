import type { ShippingContinentCode } from '@/lib/shipping-continents';
import {
  getShippingContinent,
  getShippingContinentLabel,
  isShippingContinentCode,
  migrateLegacyRegionCode,
} from '@/lib/shipping-continents';
import type { ShippingCountryRateConfig } from '@/lib/commerce-config';

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

  return {
    id: input.id,
    regionCode,
    countryIsoCode,
    regionName,
    countryName,
    countryCode: storefrontCountryCode,
    shippingMethodCode: input.shippingMethodCode,
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
