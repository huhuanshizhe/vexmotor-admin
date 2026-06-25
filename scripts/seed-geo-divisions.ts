import '@/lib/env';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import type { ShippingContinentCode } from '@/lib/shipping-continents';
import { db } from '@/server/db';
import { geoDivisions } from '@/server/db/schema';

type CountrySeedRecord = {
  code: string;
  iso_alpha2: string;
  iso_alpha3: string;
  continent_code: ShippingContinentCode;
  name_en: string;
  name_zh?: string | null;
};

type SubdivisionSeedRecord = {
  code: string;
  name_en: string;
  name_zh?: string | null;
  level: 'admin1' | 'admin2' | 'admin3';
  parent_code?: string | null;
};

const DATA_DIR = path.join(process.cwd(), 'src/data/geo');
const ISO3166_URL = 'https://raw.githubusercontent.com/olahol/iso-3166-2.json/master/iso-3166-2.json';
const COUNTRIES_URL = 'https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json';
const ZH_COUNTRIES_URL = 'https://raw.githubusercontent.com/umpirsky/country-list/master/data/zh_CN/country.json';
const CN_PROVINCES_URL = 'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/provinces.json';
const CN_CITIES_URL = 'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/cities.json';
const CN_AREAS_URL = 'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/areas.json';

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function mapContinent(region: string | null | undefined, subregion: string | null | undefined): ShippingContinentCode {
  const normalizedRegion = (region ?? '').trim();
  const normalizedSubregion = (subregion ?? '').trim();
  if (normalizedRegion === 'Polar') return 'ANTARCTICA';
  if (normalizedRegion === 'Africa') return 'AFRICA';
  if (normalizedRegion === 'Asia') return 'ASIA';
  if (normalizedRegion === 'Europe') return 'EUROPE';
  if (normalizedRegion === 'Oceania') return 'OCEANIA';
  if (normalizedRegion === 'Americas') {
    if (['Northern America', 'Central America', 'Caribbean'].includes(normalizedSubregion)) {
      return 'NORTH_AMERICA';
    }
    return 'SOUTH_AMERICA';
  }
  return 'OTHER';
}

function inferLevel(code: string, countryIso: string): SubdivisionSeedRecord['level'] {
  const parts = code.split('-');
  if (parts.length <= 2) return 'admin1';
  if (parts.length === 3) return 'admin2';
  return 'admin3';
}

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function buildCountriesJson(): Promise<CountrySeedRecord[]> {
  const [countries, zhMap] = await Promise.all([
    fetchJson<Array<{ 'alpha-2': string; 'alpha-3': string; name: string; region: string; 'sub-region': string }>>(COUNTRIES_URL),
    fetchJson<Record<string, string>>(ZH_COUNTRIES_URL),
  ]);

  return countries.map((country) => ({
    code: country['alpha-2'],
    iso_alpha2: country['alpha-2'],
    iso_alpha3: country['alpha-3'],
    continent_code: mapContinent(country.region, country['sub-region']),
    name_en: country.name,
    name_zh: zhMap[country['alpha-2']] ?? null,
  }));
}

async function buildIsoSubdivisions(countryIso: string): Promise<SubdivisionSeedRecord[]> {
  const payload = await fetchJson<Record<string, { name: string; divisions: Record<string, string> }>>(ISO3166_URL);
  const country = payload[countryIso];
  if (!country?.divisions) return [];

  return Object.entries(country.divisions).map(([code, name]) => ({
    code,
    name_en: name,
    level: inferLevel(code, countryIso),
    parent_code: null,
  }));
}

async function buildChinaSubdivisions(): Promise<SubdivisionSeedRecord[]> {
  const [provinces, cities, areas, isoPayload] = await Promise.all([
    fetchJson<Array<{ code: string; name: string }>>(CN_PROVINCES_URL),
    fetchJson<Array<{ code: string; name: string; provinceCode: string }>>(CN_CITIES_URL),
    fetchJson<Array<{ code: string; name: string; cityCode: string; provinceCode: string }>>(CN_AREAS_URL),
    fetchJson<Record<string, { divisions: Record<string, string> }>>(ISO3166_URL),
  ]);

  const isoProvinceNames = isoPayload.CN?.divisions ?? {};
  const provinceCodeToIso = new Map<string, string>();
  for (const province of provinces) {
    const isoEntry = Object.entries(isoProvinceNames).find(([, name]) => name.includes(province.name.slice(0, 2))
      || province.name.includes(name.slice(0, 2)));
    const isoCode = isoEntry?.[0] ?? `CN-${province.code.slice(0, 2).toUpperCase()}`;
    provinceCodeToIso.set(province.code, isoCode);
  }

  const records: SubdivisionSeedRecord[] = provinces.map((province) => {
    const isoCode = provinceCodeToIso.get(province.code) ?? `CN-${province.code}`;
    return {
      code: isoCode,
      name_en: isoProvinceNames[isoCode] ?? province.name,
      name_zh: province.name,
      level: 'admin1',
      parent_code: null,
    };
  });

  for (const city of cities) {
    const parentCode = provinceCodeToIso.get(city.provinceCode) ?? `CN-${city.provinceCode}`;
    records.push({
      code: `CN-${city.code}`,
      name_en: city.name,
      name_zh: city.name,
      level: 'admin2',
      parent_code: parentCode,
    });
  }

  for (const area of areas) {
    const parentCode = `CN-${area.cityCode}`;
    records.push({
      code: `CN-${area.code}`,
      name_en: area.name,
      name_zh: area.name,
      level: 'admin3',
      parent_code: parentCode,
    });
  }

  return records;
}

async function writeSeedFiles() {
  await ensureDataDir();
  const countries = await buildCountriesJson();
  const us = await buildIsoSubdivisions('US');
  const gb = await buildIsoSubdivisions('GB');
  const cn = await buildChinaSubdivisions();

  await Promise.all([
    writeFile(path.join(DATA_DIR, 'countries.json'), JSON.stringify(countries, null, 2)),
    writeFile(path.join(DATA_DIR, 'us-iso3166-2.json'), JSON.stringify(us, null, 2)),
    writeFile(path.join(DATA_DIR, 'gb-iso3166-2.json'), JSON.stringify(gb, null, 2)),
    writeFile(path.join(DATA_DIR, 'cn-iso3166-2.json'), JSON.stringify(cn, null, 2)),
  ]);

  return { countries, us, gb, cn };
}

async function readSeedFiles() {
  const read = async <T>(filename: string) => JSON.parse(await readFile(path.join(DATA_DIR, filename), 'utf8')) as T;
  try {
    return {
      countries: await read<CountrySeedRecord[]>('countries.json'),
      us: await read<SubdivisionSeedRecord[]>('us-iso3166-2.json'),
      gb: await read<SubdivisionSeedRecord[]>('gb-iso3166-2.json'),
      cn: await read<SubdivisionSeedRecord[]>('cn-iso3166-2.json'),
    };
  } catch {
    return writeSeedFiles();
  }
}

async function upsertCountry(record: CountrySeedRecord) {
  const [existing] = await db
    .select({ id: geoDivisions.id })
    .from(geoDivisions)
    .where(and(eq(geoDivisions.level, 'country'), eq(geoDivisions.isoAlpha2, record.iso_alpha2)))
    .limit(1);

  const values = {
    parentId: null,
    level: 'country' as const,
    code: record.code,
    isoAlpha2: record.iso_alpha2,
    isoAlpha3: record.iso_alpha3,
    continentCode: record.continent_code,
    nameEn: record.name_en,
    nameZh: record.name_zh ?? null,
    nameNative: record.name_zh ?? record.name_en,
    nameEnTitle: titleCase(record.name_en),
    sortOrder: 0,
    enabled: true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(geoDivisions).set(values).where(eq(geoDivisions.id, existing.id));
    return existing.id;
  }

  const [inserted] = await db.insert(geoDivisions).values(values).returning({ id: geoDivisions.id });
  return inserted.id;
}

async function upsertSubdivision(
  countryId: string,
  record: SubdivisionSeedRecord,
  codeToId: Map<string, string>,
) {
  const parentId = record.parent_code ? codeToId.get(record.parent_code) ?? countryId : countryId;
  const [existing] = await db
    .select({ id: geoDivisions.id })
    .from(geoDivisions)
    .where(and(eq(geoDivisions.parentId, parentId), eq(geoDivisions.code, record.code)))
    .limit(1);

  const values = {
    parentId,
    level: record.level,
    code: record.code,
    isoAlpha2: null,
    isoAlpha3: null,
    continentCode: null,
    nameEn: record.name_en,
    nameZh: record.name_zh ?? null,
    nameNative: record.name_zh ?? record.name_en,
    nameEnTitle: titleCase(record.name_en),
    sortOrder: 0,
    enabled: true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(geoDivisions).set(values).where(eq(geoDivisions.id, existing.id));
    codeToId.set(record.code, existing.id);
    return existing.id;
  }

  const [inserted] = await db.insert(geoDivisions).values(values).returning({ id: geoDivisions.id });
  codeToId.set(record.code, inserted.id);
  return inserted.id;
}

async function seedSubdivisions(countryIso: string, records: SubdivisionSeedRecord[]) {
  const [country] = await db
    .select({ id: geoDivisions.id })
    .from(geoDivisions)
    .where(and(eq(geoDivisions.level, 'country'), eq(geoDivisions.isoAlpha2, countryIso)))
    .limit(1);

  if (!country) {
    throw new Error(`Country ${countryIso} not found before seeding subdivisions`);
  }

  const codeToId = new Map<string, string>();
  const sorted = [...records].sort((left, right) => {
    const levelOrder = { admin1: 1, admin2: 2, admin3: 3 } as const;
    return levelOrder[left.level] - levelOrder[right.level] || left.code.localeCompare(right.code);
  });

  for (const record of sorted) {
    await upsertSubdivision(country.id, record, codeToId);
  }
}

async function main() {
  const shouldRefresh = process.argv.includes('--refresh');
  const data = shouldRefresh ? await writeSeedFiles() : await readSeedFiles();

  console.log(`Seeding ${data.countries.length} countries...`);
  for (const country of data.countries) {
    await upsertCountry(country);
  }

  console.log(`Seeding US subdivisions (${data.us.length})...`);
  await seedSubdivisions('US', data.us);

  console.log(`Seeding GB subdivisions (${data.gb.length})...`);
  await seedSubdivisions('GB', data.gb);

  console.log(`Seeding CN subdivisions (${data.cn.length})...`);
  await seedSubdivisions('CN', data.cn);

  console.log('Geo divisions seed completed.');
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
