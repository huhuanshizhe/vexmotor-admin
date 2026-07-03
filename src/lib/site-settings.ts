export type SiteSettings = {
  defaultCurrencyCode: string;
  defaultCountryCode: string;
  paymentSandboxMode: boolean;
  extra?: Record<string, unknown>;
};

export type PaymentDiagnostics = {
  activeMode: 'sandbox' | 'live';
  stripe: { configured: boolean };
  airwallex: { configured: boolean };
};

export type AdminSiteSettingsResponse = SiteSettings & {
  paymentDiagnostics: PaymentDiagnostics;
};

export const defaultSiteSettings: SiteSettings = {
  defaultCurrencyCode: 'USD',
  defaultCountryCode: 'US',
  paymentSandboxMode: true,
  extra: {},
};

export function cloneSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    defaultCurrencyCode: settings.defaultCurrencyCode,
    defaultCountryCode: settings.defaultCountryCode,
    paymentSandboxMode: settings.paymentSandboxMode,
    extra: settings.extra ? { ...settings.extra } : {},
  };
}
