import { and, eq } from 'drizzle-orm';

import type { ShippingContinentCode } from '@/lib/shipping-continents';
import { formatGeoCountryLabel } from '@/lib/geo-display';
import { db } from '@/server/db';
import { geoDivisions } from '@/server/db/schema';

export type GeoCountryRow = {
  id: string;
  code: string;
  isoAlpha2: string;
  isoAlpha3: string | null;
  continentCode: string;
  nameEn: string;
  nameZh: string | null;
  nameEnTitle: string;
};

export { formatGeoCountryLabel } from '@/lib/geo-display';

export async function listGeoCountries(options?: { continent?: string }) {
  const conditions = [eq(geoDivisions.level, 'country'), eq(geoDivisions.enabled, true)];
  if (options?.continent) {
    conditions.push(eq(geoDivisions.continentCode, options.continent));
  }

  const rows = await db
    .select({
      id: geoDivisions.id,
      code: geoDivisions.code,
      isoAlpha2: geoDivisions.isoAlpha2,
      isoAlpha3: geoDivisions.isoAlpha3,
      continentCode: geoDivisions.continentCode,
      nameEn: geoDivisions.nameEn,
      nameZh: geoDivisions.nameZh,
      nameEnTitle: geoDivisions.nameEnTitle,
    })
    .from(geoDivisions)
    .where(and(...conditions))
    .orderBy(geoDivisions.sortOrder, geoDivisions.nameEnTitle);

  return rows
    .filter((row): row is GeoCountryRow => Boolean(row.isoAlpha2 && row.continentCode))
    .map((row) => ({
      ...row,
      isoAlpha2: row.isoAlpha2!,
      continentCode: row.continentCode!,
      label: formatGeoCountryLabel({
        isoAlpha2: row.isoAlpha2!,
        nameEn: row.nameEn,
        nameZh: row.nameZh,
      }),
    }));
}

export async function getGeoCountryByIso(isoAlpha2: string) {
  const [row] = await db
    .select()
    .from(geoDivisions)
    .where(and(eq(geoDivisions.level, 'country'), eq(geoDivisions.isoAlpha2, isoAlpha2.toUpperCase())))
    .limit(1);
  return row ?? null;
}

export async function listGeoDivisions(options: {
  countryIso: string;
  parentId?: string | null;
}) {
  const country = await getGeoCountryByIso(options.countryIso);
  if (!country) {
    return [];
  }

  const parentId = options.parentId === undefined || options.parentId === null ? country.id : options.parentId;
  const rows = await db
    .select()
    .from(geoDivisions)
    .where(and(eq(geoDivisions.parentId, parentId), eq(geoDivisions.enabled, true)))
    .orderBy(geoDivisions.sortOrder, geoDivisions.nameEnTitle);

  return rows;
}

export async function getGeoCountryName(isoAlpha2: string | null | undefined) {
  if (!isoAlpha2) return null;
  const country = await getGeoCountryByIso(isoAlpha2);
  return country?.nameEn ?? null;
}

export async function countryBelongsToContinent(isoAlpha2: string, continentCode: ShippingContinentCode) {
  const country = await getGeoCountryByIso(isoAlpha2);
  return country?.continentCode === continentCode;
}
