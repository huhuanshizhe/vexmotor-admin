import 'server-only';

import type { ShippingContinentCode } from '@/lib/shipping-continents';
import { listGeoCountries } from '@/server/geo/divisions';

let cachedMap: Record<string, ShippingContinentCode> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getCountryContinentByIso(): Promise<Record<string, ShippingContinentCode>> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }

  const countries = await listGeoCountries();
  cachedMap = Object.fromEntries(
    countries.map((country) => [country.isoAlpha2, country.continentCode as ShippingContinentCode]),
  ) as Record<string, ShippingContinentCode>;
  cachedAt = now;
  return cachedMap;
}

export async function getContinentForCountryIso(isoAlpha2: string): Promise<ShippingContinentCode | null> {
  const map = await getCountryContinentByIso();
  return map[isoAlpha2.trim().toUpperCase()] ?? null;
}
