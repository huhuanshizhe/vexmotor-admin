import type { FeatureValueType } from '@/lib/feature-definition-content';

export type FeatureUnitCategory =
  | 'Length'
  | 'Mass'
  | 'Torque'
  | 'Electrical'
  | 'Temperature'
  | 'Pressure'
  | 'Speed'
  | 'Power'
  | 'Time'
  | 'Angle'
  | 'Volume'
  | 'Other';

export type CommonFeatureUnit = {
  code: string;
  name: string;
  symbol: string;
  category: FeatureUnitCategory;
};

export const COMMON_FEATURE_UNITS = [
  { code: 'mm', name: 'Millimeter', symbol: 'mm', category: 'Length' },
  { code: 'cm', name: 'Centimeter', symbol: 'cm', category: 'Length' },
  { code: 'm', name: 'Meter', symbol: 'm', category: 'Length' },
  { code: 'in', name: 'Inch', symbol: 'in', category: 'Length' },
  { code: 'ft', name: 'Foot', symbol: 'ft', category: 'Length' },
  { code: 'g', name: 'Gram', symbol: 'g', category: 'Mass' },
  { code: 'kg', name: 'Kilogram', symbol: 'kg', category: 'Mass' },
  { code: 'lb', name: 'Pound', symbol: 'lb', category: 'Mass' },
  { code: 'oz', name: 'Ounce', symbol: 'oz', category: 'Mass' },
  { code: 'Nm', name: 'Newton Meter', symbol: 'Nm', category: 'Torque' },
  { code: 'Ncm', name: 'Newton Centimeter', symbol: 'N·cm', category: 'Torque' },
  { code: 'kgfcm', name: 'Kilogram-force Centimeter', symbol: 'kgf·cm', category: 'Torque' },
  { code: 'kgfm', name: 'Kilogram-force Meter', symbol: 'kgf·m', category: 'Torque' },
  { code: 'lbf-in', name: 'Pound-force Inch', symbol: 'lbf·in', category: 'Torque' },
  { code: 'V', name: 'Volt', symbol: 'V', category: 'Electrical' },
  { code: 'mV', name: 'Millivolt', symbol: 'mV', category: 'Electrical' },
  { code: 'kV', name: 'Kilovolt', symbol: 'kV', category: 'Electrical' },
  { code: 'A', name: 'Ampere', symbol: 'A', category: 'Electrical' },
  { code: 'mA', name: 'Milliampere', symbol: 'mA', category: 'Electrical' },
  { code: 'uA', name: 'Microampere', symbol: 'µA', category: 'Electrical' },
  { code: 'W', name: 'Watt', symbol: 'W', category: 'Power' },
  { code: 'kW', name: 'Kilowatt', symbol: 'kW', category: 'Power' },
  { code: 'mW', name: 'Milliwatt', symbol: 'mW', category: 'Power' },
  { code: 'HP', name: 'Horsepower', symbol: 'HP', category: 'Power' },
  { code: 'Hz', name: 'Hertz', symbol: 'Hz', category: 'Electrical' },
  { code: 'kHz', name: 'Kilohertz', symbol: 'kHz', category: 'Electrical' },
  { code: 'MHz', name: 'Megahertz', symbol: 'MHz', category: 'Electrical' },
  { code: 'Ohm', name: 'Ohm', symbol: 'Ω', category: 'Electrical' },
  { code: 'kOhm', name: 'Kiloohm', symbol: 'kΩ', category: 'Electrical' },
  { code: 'MOhm', name: 'Megaohm', symbol: 'MΩ', category: 'Electrical' },
  { code: 'F', name: 'Farad', symbol: 'F', category: 'Electrical' },
  { code: 'uF', name: 'Microfarad', symbol: 'µF', category: 'Electrical' },
  { code: 'nF', name: 'Nanofarad', symbol: 'nF', category: 'Electrical' },
  { code: 'H', name: 'Henry', symbol: 'H', category: 'Electrical' },
  { code: 'mH', name: 'Millihenry', symbol: 'mH', category: 'Electrical' },
  { code: 'uH', name: 'Microhenry', symbol: 'µH', category: 'Electrical' },
  { code: 'C', name: 'Celsius', symbol: '°C', category: 'Temperature' },
  { code: 'F-deg', name: 'Fahrenheit', symbol: '°F', category: 'Temperature' },
  { code: 'K', name: 'Kelvin', symbol: 'K', category: 'Temperature' },
  { code: 'Pa', name: 'Pascal', symbol: 'Pa', category: 'Pressure' },
  { code: 'kPa', name: 'Kilopascal', symbol: 'kPa', category: 'Pressure' },
  { code: 'MPa', name: 'Megapascal', symbol: 'MPa', category: 'Pressure' },
  { code: 'bar', name: 'Bar', symbol: 'bar', category: 'Pressure' },
  { code: 'psi', name: 'PSI', symbol: 'psi', category: 'Pressure' },
  { code: 'rpm', name: 'Revolutions Per Minute', symbol: 'rpm', category: 'Speed' },
  { code: 'rps', name: 'Revolutions Per Second', symbol: 'rps', category: 'Speed' },
  { code: 'mps', name: 'Meters Per Second', symbol: 'm/s', category: 'Speed' },
  { code: 'kmph', name: 'Kilometers Per Hour', symbol: 'km/h', category: 'Speed' },
  { code: 'deg', name: 'Degree', symbol: '°', category: 'Angle' },
  { code: 'rad', name: 'Radian', symbol: 'rad', category: 'Angle' },
  { code: 's', name: 'Second', symbol: 's', category: 'Time' },
  { code: 'ms', name: 'Millisecond', symbol: 'ms', category: 'Time' },
  { code: 'us', name: 'Microsecond', symbol: 'µs', category: 'Time' },
  { code: 'min', name: 'Minute', symbol: 'min', category: 'Time' },
  { code: 'h', name: 'Hour', symbol: 'h', category: 'Time' },
  { code: 'L', name: 'Liter', symbol: 'L', category: 'Volume' },
  { code: 'mL', name: 'Milliliter', symbol: 'mL', category: 'Volume' },
  { code: 'gal', name: 'Gallon', symbol: 'gal', category: 'Volume' },
  { code: 'pct', name: 'Percent', symbol: '%', category: 'Other' },
  { code: 'dB', name: 'Decibel', symbol: 'dB', category: 'Other' },
  { code: 'IP', name: 'IP Rating', symbol: 'IP', category: 'Other' },
  { code: 'pcs', name: 'Pieces', symbol: 'pcs', category: 'Other' },
] as const satisfies readonly CommonFeatureUnit[];

const LOCALE_UNIT_OVERRIDES: Record<string, string[]> = {
  en: ['in', 'lb', 'lbf-in', 'F-deg', 'psi', 'HP', 'rpm', 'gal'],
  'zh-CN': ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'rpm', 'kPa'],
  'zh-TW': ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'rpm', 'kPa'],
  de: ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'bar', 'rpm'],
  es: ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'bar', 'rpm'],
  fr: ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'bar', 'rpm'],
  ja: ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'rpm'],
  ko: ['mm', 'kg', 'Nm', 'V', 'A', 'W', 'Hz', 'C', 'rpm'],
};

export function getCommonFeatureUnit(code: string) {
  return COMMON_FEATURE_UNITS.find((unit) => unit.code === code || unit.symbol === code) ?? null;
}

export function filterFeatureUnits(keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [...COMMON_FEATURE_UNITS];
  return COMMON_FEATURE_UNITS.filter((unit) =>
    [unit.code, unit.name, unit.symbol, unit.category].join(' ').toLowerCase().includes(normalized),
  );
}

export function getDefaultUnitsForLocale(locale: string): CommonFeatureUnit[] {
  const codes = LOCALE_UNIT_OVERRIDES[locale] ?? LOCALE_UNIT_OVERRIDES.en;
  const mapped: CommonFeatureUnit[] = [];
  for (const code of codes) {
    const unit = COMMON_FEATURE_UNITS.find((item) => item.code === code);
    if (unit) mapped.push(unit);
  }
  return mapped.length ? mapped : COMMON_FEATURE_UNITS.slice(0, 12) as CommonFeatureUnit[];
}

export function formatFeatureUnitOption(unit: CommonFeatureUnit) {
  return `${unit.symbol} — ${unit.name} (${unit.code})`;
}

export function isUnitRequiredForValueType(valueType: FeatureValueType) {
  return valueType === 'number';
}

export function buildFeatureUnitAutoCompleteOptions(units: CommonFeatureUnit[]) {
  return units.map((unit) => ({
    value: unit.symbol,
    label: formatFeatureUnitOption(unit),
  }));
}
