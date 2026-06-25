export type ShippingRegionCode = 'US' | 'CA' | 'GB' | 'DE' | 'AU' | 'OTHER';

export type ShippingRegionDefinition = {
  code: ShippingRegionCode;
  name: string;
  group: string;
};

export const SHIPPING_REGIONS: ShippingRegionDefinition[] = [
  { code: 'US', name: 'United States', group: '北美' },
  { code: 'CA', name: 'Canada', group: '北美' },
  { code: 'GB', name: 'United Kingdom', group: '欧洲' },
  { code: 'DE', name: 'Germany', group: '欧洲' },
  { code: 'AU', name: 'Australia', group: '大洋洲' },
  { code: 'OTHER', name: 'Other', group: '其他' },
];

const regionByCode = new Map(SHIPPING_REGIONS.map((region) => [region.code, region]));

export function isShippingRegionCode(value: string): value is ShippingRegionCode {
  return regionByCode.has(value as ShippingRegionCode);
}

export function getShippingRegionName(code: string) {
  return regionByCode.get(code as ShippingRegionCode)?.name ?? code;
}

export function getShippingRegionLabel(code: string) {
  const region = regionByCode.get(code as ShippingRegionCode);
  return region ? `${region.name} (${region.code})` : code;
}

export function getShippingRegionGroupedSelectOptions(excludeCodes: string[] = []) {
  const excluded = new Set(excludeCodes);
  const groups = new Map<string, Array<{ value: string; label: string }>>();

  for (const region of SHIPPING_REGIONS) {
    if (excluded.has(region.code)) continue;
    const bucket = groups.get(region.group) ?? [];
    bucket.push({ value: region.code, label: `${region.name} (${region.code})` });
    groups.set(region.group, bucket);
  }

  return [...groups.entries()].map(([label, options]) => ({ label, options }));
}

export function getShippingRegionFlatSelectOptions(excludeCodes: string[] = []) {
  const excluded = new Set(excludeCodes);
  return SHIPPING_REGIONS
    .filter((region) => !excluded.has(region.code))
    .map((region) => ({ value: region.code, label: `${region.name} (${region.code})` }));
}
