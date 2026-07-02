export type UiStringStatus = 'active' | 'deprecated';
export type UiStringTranslationSource = 'manual' | 'llm';

export type UiStringManifestEntry = {
  key: string;
  default: string;
  group: string;
  context?: string;
};

export type UiStringsManifest = {
  version: string;
  generatedAt: string;
  sourceLocale: 'en';
  keys: UiStringManifestEntry[];
};

export type UiStringResetScope = 'all_translations' | 'locale' | 'rebuild_defaults';

export type AdminUiStringRow = {
  key: string;
  defaultText: string;
  group: string;
  context: string | null;
  status: UiStringStatus;
  updatedAt: string;
  translations: Record<string, { value: string; source: UiStringTranslationSource; updatedAt: string }>;
  missingLocales: string[];
};

export const UI_STRING_SOURCE_LOCALE = 'en' as const;
