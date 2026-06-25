export type ShippingContinentCode =
  | 'AFRICA'
  | 'ANTARCTICA'
  | 'ASIA'
  | 'EUROPE'
  | 'NORTH_AMERICA'
  | 'SOUTH_AMERICA'
  | 'OCEANIA'
  | 'OTHER';

export type ShippingContinentDefinition = {
  code: ShippingContinentCode;
  name: string;
  nameZh: string;
  shortCode: string;
};

export const SHIPPING_CONTINENTS: ShippingContinentDefinition[] = [
  { code: 'AFRICA', name: 'Africa', nameZh: '非洲', shortCode: 'AF' },
  { code: 'ANTARCTICA', name: 'Antarctica', nameZh: '南极洲', shortCode: 'AN' },
  { code: 'ASIA', name: 'Asia', nameZh: '亚洲', shortCode: 'AS' },
  { code: 'EUROPE', name: 'Europe', nameZh: '欧洲', shortCode: 'EU' },
  { code: 'NORTH_AMERICA', name: 'North America', nameZh: '北美洲', shortCode: 'NA' },
  { code: 'SOUTH_AMERICA', name: 'South America', nameZh: '南美洲', shortCode: 'SA' },
  { code: 'OCEANIA', name: 'Oceania', nameZh: '大洋洲', shortCode: 'OC' },
  { code: 'OTHER', name: 'Other', nameZh: '其他', shortCode: 'OT' },
];

const continentByCode = new Map(SHIPPING_CONTINENTS.map((item) => [item.code, item]));

/** 旧 shipping-regions 国家码 → 大洲 + 国家 ISO */
export const LEGACY_SHIPPING_REGION_TO_CONTINENT: Record<string, { regionCode: ShippingContinentCode; countryIsoCode: string | null }> = {
  US: { regionCode: 'NORTH_AMERICA', countryIsoCode: 'US' },
  CA: { regionCode: 'NORTH_AMERICA', countryIsoCode: 'CA' },
  GB: { regionCode: 'EUROPE', countryIsoCode: 'GB' },
  DE: { regionCode: 'EUROPE', countryIsoCode: 'DE' },
  AU: { regionCode: 'OCEANIA', countryIsoCode: 'AU' },
  OTHER: { regionCode: 'OTHER', countryIsoCode: null },
};

export function isShippingContinentCode(value: string): value is ShippingContinentCode {
  return continentByCode.has(value as ShippingContinentCode);
}

export function getShippingContinent(code: string) {
  return continentByCode.get(code as ShippingContinentCode) ?? null;
}

export function getShippingContinentLabel(code: string) {
  const continent = getShippingContinent(code);
  return continent ? `${continent.shortCode} — ${continent.name} — ${continent.nameZh}` : code;
}

export function getShippingContinentShortLabel(code: string) {
  const continent = getShippingContinent(code);
  return continent ? `${continent.shortCode} — ${continent.nameZh}` : code;
}

export function getShippingContinentSelectOptions(excludeCodes: string[] = []) {
  const excluded = new Set(excludeCodes);
  return SHIPPING_CONTINENTS
    .filter((item) => !excluded.has(item.code))
    .map((item) => ({ value: item.code, label: getShippingContinentLabel(item.code) }));
}

export function migrateLegacyRegionCode(legacyCode: string) {
  const normalized = legacyCode.trim().toUpperCase();
  return LEGACY_SHIPPING_REGION_TO_CONTINENT[normalized] ?? { regionCode: 'OTHER' as ShippingContinentCode, countryIsoCode: null };
}
