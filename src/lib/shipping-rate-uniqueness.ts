import type { ShippingCountryRateConfig } from '@/lib/commerce-config';

export type ShippingRateScopeInput = {
  shippingMethodCode: string;
  regionCode: string;
  countryIsoCode?: string | null;
  editingId?: string | null;
};

export type ShippingRateScopeValidation =
  | { ok: true }
  | { ok: false; message: string };

function normalizeCountryIsoCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

export function validateShippingRateScope(
  rates: ShippingCountryRateConfig[],
  input: ShippingRateScopeInput,
): ShippingRateScopeValidation {
  const countryIsoCode = normalizeCountryIsoCode(input.countryIsoCode);
  const scopeKey = getShippingRateScopeKey({
    regionCode: input.regionCode as ShippingCountryRateConfig['regionCode'],
    countryIsoCode,
  });

  const duplicate = rates.some(
    (rate) => rate.shippingMethodCode === input.shippingMethodCode
      && rate.id !== input.editingId
      && getShippingRateScopeKey(rate) === scopeKey,
  );

  if (!duplicate) {
    return { ok: true };
  }

  if (!countryIsoCode) {
    return { ok: false, message: '该物流方式下已存在相同地区的费率' };
  }

  return { ok: false, message: '该物流方式下已存在相同地区与国家的费率' };
}

export function getShippingRateScopeKey(rate: Pick<ShippingCountryRateConfig, 'regionCode' | 'countryIsoCode'>) {
  const country = normalizeCountryIsoCode(rate.countryIsoCode);
  return `${rate.regionCode}::${country ?? '*'}`;
}
