export const featureSpecCategories = ['general', 'electrical', 'mechanical', 'performance', 'environmental'] as const;
export type FeatureSpecCategory = (typeof featureSpecCategories)[number];

export const featureValueTypes = ['text', 'number', 'boolean'] as const;
export type FeatureValueType = (typeof featureValueTypes)[number];

export const featureDefinitionStatuses = ['active', 'inactive'] as const;
export type FeatureDefinitionStatus = (typeof featureDefinitionStatuses)[number];

export const featureSpecCategoryLabels: Record<FeatureSpecCategory, string> = {
  general: '通用',
  electrical: '电气',
  mechanical: '机械',
  performance: '性能',
  environmental: '环境',
};

export const featureValueTypeLabels: Record<FeatureValueType, string> = {
  text: '文本',
  number: '数值',
  boolean: '是/否',
};

export type AdminFeatureDefinitionTranslation = {
  id: string;
  definitionId: string;
  locale: string;
  name: string;
  textOptions: string[];
  specCategory: FeatureSpecCategory;
  valueType: FeatureValueType;
  unit: string | null;
  status: FeatureDefinitionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminFeatureDefinitionListItem = {
  id: string;
  name: string;
  specCategory: FeatureSpecCategory;
  valueType: FeatureValueType;
  status: FeatureDefinitionStatus;
  sortOrder: number;
  valueDisplay: string;
  unit: string | null;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

export function resolveFeatureDefinitionId(item: Pick<AdminFeatureDefinitionTranslation, 'definitionId'>) {
  return item.definitionId;
}

export function formatFeatureValueDisplay(
  valueType: FeatureValueType,
  translation: Pick<AdminFeatureDefinitionTranslation, 'textOptions'>,
): string {
  if (valueType === 'text') {
    const items = translation.textOptions.filter((item) => item.trim());
    return items.length ? items.join('、') : '—';
  }
  return '—';
}

export function isUnitRequiredForValueType(valueType: FeatureValueType) {
  return valueType === 'number';
}

export function splitTextOptionsMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function joinTextOptionsMultiline(options: string[]) {
  return options.join('\n');
}

export const featureSpecCategoryOptions = Object.entries(featureSpecCategoryLabels).map(([value, label]) => ({ value, label }));
export const featureValueTypeOptions = Object.entries(featureValueTypeLabels).map(([value, label]) => ({ value, label }));
