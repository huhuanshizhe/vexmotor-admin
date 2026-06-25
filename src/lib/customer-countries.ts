const REGISTER_COUNTRY_ISO_MAP: Record<string, string> = {
  'United States': 'US',
  Germany: 'DE',
  France: 'FR',
  Spain: 'ES',
  'United Kingdom': 'GB',
  Canada: 'CA',
  Mexico: 'MX',
  China: 'CN',
  Japan: 'JP',
};

export function normalizeCompanyCountryCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'Other') return null;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return REGISTER_COUNTRY_ISO_MAP[trimmed] ?? null;
}
