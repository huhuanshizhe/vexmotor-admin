import type { FeatureDefinitionStatus, FeatureValueType } from '@/lib/feature-definition-content';

export type ProductFeatureAssignmentStatus = FeatureDefinitionStatus;

export type AdminProductFeatureValuePreview = {
  id: string;
  displayValue: string;
  displayUnit: string | null;
};

export type AdminProductFeatureAssignmentListItem = {
  id: string;
  productId: string;
  definitionId: string;
  key: string;
  name: string;
  valueType: FeatureValueType;
  status: ProductFeatureAssignmentStatus;
  sortOrder: number;
  valueCount: number;
  values: AdminProductFeatureValuePreview[];
  createdAt: string;
  updatedAt: string;
};

export type AdminProductFeatureValueListItem = {
  id: string;
  assignmentId: string;
  status: ProductFeatureAssignmentStatus;
  sortOrder: number;
  displayValue: string;
  displayUnit: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductFeatureValueTranslation = {
  id: string;
  valueId: string;
  locale: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductFeatureValueDetail = {
  value: AdminProductFeatureValueListItem;
  valueType: FeatureValueType;
  definitionKey: string;
  definitionName: string;
  unitByLocale: Record<string, string | null>;
  textOptionsByLocale: Record<string, string[]>;
  translations: AdminProductFeatureValueTranslation[];
};

export function formatProductFeatureValueCore(
  valueType: FeatureValueType,
  translation: Pick<AdminProductFeatureValueTranslation, 'valueText' | 'valueNumber' | 'valueBoolean'> | null | undefined,
): string {
  if (!translation) return '—';
  if (valueType === 'number') {
    if (translation.valueNumber == null || translation.valueNumber === '') return '—';
    return String(translation.valueNumber);
  }
  if (valueType === 'boolean') {
    if (translation.valueBoolean == null) return '—';
    return translation.valueBoolean ? '是' : '否';
  }
  const text = translation.valueText?.trim();
  return text || '—';
}

export function formatProductFeatureValueDisplay(
  valueType: FeatureValueType,
  translation: Pick<AdminProductFeatureValueTranslation, 'valueText' | 'valueNumber' | 'valueBoolean'> | null | undefined,
  unit?: string | null,
): string {
  const core = formatProductFeatureValueCore(valueType, translation);
  if (valueType === 'number' && core !== '—' && unit?.trim()) {
    return `${core} ${unit.trim()}`;
  }
  return core;
}
