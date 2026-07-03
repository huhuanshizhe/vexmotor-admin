export type SiteSettings = {
  defaultCurrencyCode: string;
  defaultCountryCode: string;
  extra?: Record<string, unknown>;
};

export const defaultSiteSettings: SiteSettings = {
  defaultCurrencyCode: 'USD',
  defaultCountryCode: 'US',
  extra: {},
};

export function cloneSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    defaultCurrencyCode: settings.defaultCurrencyCode,
    defaultCountryCode: settings.defaultCountryCode,
    extra: settings.extra ? { ...settings.extra } : {},
  };
}
