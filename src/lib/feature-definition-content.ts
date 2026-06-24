export const featureSpecCategories = ['general', 'electrical', 'mechanical', 'performance', 'environmental'] as const;
export type FeatureSpecCategory = (typeof featureSpecCategories)[number];

export const featureValueTypes = ['text', 'number', 'range', 'boolean', 'select'] as const;
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
  range: '范围',
  boolean: '开关',
  select: '下拉选项',
};

export type AdminFeatureDefinitionTranslation = {
  id: string;
  definitionId: string;
  locale: string;
  name: string;
  valueText: string | null;
  valueMin: number | null;
  valueMax: number | null;
  unit: string | null;
  specCategory: FeatureSpecCategory;
  valueType: FeatureValueType;
  selectOptions: string[];
  status: FeatureDefinitionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminFeatureDefinitionListItem = {
  id: string;
  name: string;
  specCategory: FeatureSpecCategory;
  valueType: FeatureValueType;
  selectOptions: string[];
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
  translation: Pick<AdminFeatureDefinitionTranslation, 'valueText' | 'valueMin' | 'valueMax'>,
): string {
  switch (valueType) {
    case 'boolean':
      return translation.valueText === 'true' ? '是' : translation.valueText === 'false' ? '否' : '—';
    case 'number':
      return translation.valueMin != null ? String(translation.valueMin) : '—';
    case 'range':
      if (translation.valueMin != null && translation.valueMax != null) {
        return `${translation.valueMin} ~ ${translation.valueMax}`;
      }
      return '—';
    case 'text':
    case 'select':
    default:
      return translation.valueText?.trim() || '—';
  }
}

export function isUnitRequiredForValueType(valueType: FeatureValueType) {
  return valueType === 'number' || valueType === 'range';
}
