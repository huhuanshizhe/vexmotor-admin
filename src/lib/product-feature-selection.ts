export type FeatureSelectionSnapshotItem = {
  definitionId: string;
  definitionKey: string;
  definitionName: string;
  valueId: string;
  display: string;
  unit?: string | null;
};

export type FeatureSelectionSnapshot = FeatureSelectionSnapshotItem[];

export type StorefrontConfigurableFeatureOption = {
  valueId: string;
  display: string;
};

export type StorefrontConfigurableFeature = {
  definitionId: string;
  assignmentId: string;
  key: string;
  name: string;
  category: string | null;
  valueType: string;
  unit: string | null;
  options: StorefrontConfigurableFeatureOption[];
};

export function buildConfigurationKey(valueIds: string[]) {
  return [...valueIds].sort().join(':');
}

export function buildConfigurationLabel(selections: FeatureSelectionSnapshot) {
  return selections.map((item) => `${item.definitionName}: ${item.display}`).join(' · ');
}
