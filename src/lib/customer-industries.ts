export const CUSTOMER_INDUSTRY_OPTIONS = [
  { value: 'factory-automation', labelEn: 'Factory Automation', labelZh: '工厂自动化' },
  { value: 'robotics', labelEn: 'Robotics', labelZh: '机器人' },
  { value: 'medical-devices', labelEn: 'Medical Devices', labelZh: '医疗设备' },
  { value: 'packaging', labelEn: 'Packaging', labelZh: '包装' },
  { value: 'cnc-tooling', labelEn: 'CNC & Tooling', labelZh: 'CNC 与工装' },
  { value: 'energy', labelEn: 'Energy', labelZh: '能源' },
  { value: 'semiconductor', labelEn: 'Semiconductor', labelZh: '半导体' },
  { value: 'university-lab', labelEn: 'University / Lab', labelZh: '高校/实验室' },
  { value: '3d-printing', labelEn: '3D Printing', labelZh: '3D 打印' },
  { value: 'textile', labelEn: 'Textile', labelZh: '纺织' },
  { value: 'photonics', labelEn: 'Photonics', labelZh: '光子学' },
  { value: 'aerospace', labelEn: 'Aerospace', labelZh: '航空航天' },
  { value: 'automotive', labelEn: 'Automotive', labelZh: '汽车' },
  { value: 'renewable-energy', labelEn: 'Renewable Energy', labelZh: '可再生能源' },
  { value: 'electronics', labelEn: 'Electronics', labelZh: '电子制造' },
  { value: 'food-beverage', labelEn: 'Food & Beverage', labelZh: '食品饮料' },
  { value: 'logistics', labelEn: 'Logistics', labelZh: '物流仓储' },
] as const;

export type CustomerIndustry = (typeof CUSTOMER_INDUSTRY_OPTIONS)[number]['value'];

const industryByValue = Object.fromEntries(
  CUSTOMER_INDUSTRY_OPTIONS.map((item) => [item.value, item]),
) as Record<CustomerIndustry, (typeof CUSTOMER_INDUSTRY_OPTIONS)[number]>;

const LEGACY_INDUSTRY_ALIASES: Record<string, CustomerIndustry> = {
  'Factory Automation': 'factory-automation',
  Robotics: 'robotics',
  'Medical Devices': 'medical-devices',
  Packaging: 'packaging',
  'CNC & Tooling': 'cnc-tooling',
  Energy: 'energy',
  Semiconductor: 'semiconductor',
  'University / Lab': 'university-lab',
  '3D Printing': '3d-printing',
  Textile: 'textile',
  Photonics: 'photonics',
  Aerospace: 'aerospace',
  Automotive: 'automotive',
  'Renewable Energy': 'renewable-energy',
  Electronics: 'electronics',
  'Food & Beverage': 'food-beverage',
  Logistics: 'logistics',
};

export function normalizeCustomerIndustry(value: string | null | undefined): CustomerIndustry | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed in industryByValue) return trimmed as CustomerIndustry;
  return LEGACY_INDUSTRY_ALIASES[trimmed] ?? null;
}

export function formatCustomerIndustryLabel(
  value: string | null | undefined,
  locale: 'bilingual' | 'en' | 'zh' = 'bilingual',
) {
  const normalized = normalizeCustomerIndustry(value);
  if (!normalized) return value?.trim() || '未填写';

  const item = industryByValue[normalized];
  if (locale === 'en') return item.labelEn;
  if (locale === 'zh') return item.labelZh;
  return `${item.labelEn} — ${item.labelZh}`;
}

/** @deprecated Use formatCustomerIndustryLabel */
export function getCustomerIndustryLabel(value: string | null | undefined) {
  return formatCustomerIndustryLabel(value);
}

export const customerIndustryFilterOptions = CUSTOMER_INDUSTRY_OPTIONS.map((item) => ({
  value: item.value,
  label: `${item.labelEn} — ${item.labelZh}`,
}));

export type CustomerIndustryListItem = {
  value: CustomerIndustry;
  label: string;
};

export function listCustomerIndustryOptions(locale: 'en' | 'zh' = 'en'): CustomerIndustryListItem[] {
  return CUSTOMER_INDUSTRY_OPTIONS.map((item) => ({
    value: item.value,
    label: locale === 'zh' ? item.labelZh : item.labelEn,
  }));
}
