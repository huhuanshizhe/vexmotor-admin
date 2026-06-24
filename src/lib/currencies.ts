import { getCommonLanguage } from '@/lib/languages';

export type CurrencyRegion = 'Major' | 'Americas' | 'Europe' | 'Asia Pacific' | 'Middle East' | 'Africa' | 'Other';

export type CommonCurrency = {
  code: string;
  name: string;
  symbol: string;
  region: CurrencyRegion;
};

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', region: 'Major' },
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'Major' },
  { code: 'GBP', name: 'British Pound', symbol: '£', region: 'Major' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', region: 'Major' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', region: 'Major' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', region: 'Major' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', region: 'Major' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', region: 'Major' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', region: 'Major' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', region: 'Major' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', region: 'Major' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', region: 'Major' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', region: 'Major' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', region: 'Major' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', region: 'Major' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', region: 'Major' },

  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', region: 'Americas' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', region: 'Americas' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', region: 'Americas' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$', region: 'Americas' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', region: 'Americas' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', region: 'Americas' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', region: 'Americas' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.', region: 'Americas' },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲', region: 'Americas' },
  { code: 'VES', name: 'Venezuelan Bolívar', symbol: 'Bs.', region: 'Americas' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', region: 'Americas' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', region: 'Americas' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', region: 'Americas' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', region: 'Americas' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', region: 'Americas' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', region: 'Americas' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', region: 'Americas' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', region: 'Americas' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$', region: 'Americas' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', region: 'Americas' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', region: 'Americas' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', region: 'Americas' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', region: 'Americas' },

  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', region: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', region: 'Europe' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', region: 'Europe' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', region: 'Europe' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', region: 'Europe' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM', region: 'Europe' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', region: 'Europe' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L', region: 'Europe' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', region: 'Europe' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', region: 'Europe' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', region: 'Europe' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', region: 'Europe' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', region: 'Europe' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', region: 'Europe' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', region: 'Europe' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', region: 'Europe' },

  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', region: 'Asia Pacific' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', region: 'Asia Pacific' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', region: 'Asia Pacific' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', region: 'Asia Pacific' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', region: 'Asia Pacific' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', region: 'Asia Pacific' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', region: 'Asia Pacific' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', region: 'Asia Pacific' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', region: 'Asia Pacific' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', region: 'Asia Pacific' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', region: 'Asia Pacific' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', region: 'Asia Pacific' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', region: 'Asia Pacific' },
  { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮', region: 'Asia Pacific' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', region: 'Asia Pacific' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', region: 'Asia Pacific' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', region: 'Asia Pacific' },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', region: 'Asia Pacific' },
  { code: 'WST', name: 'Samoan Tālā', symbol: 'T', region: 'Asia Pacific' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', region: 'Asia Pacific' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', region: 'Asia Pacific' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm', region: 'Asia Pacific' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM', region: 'Asia Pacific' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'с', region: 'Asia Pacific' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'm', region: 'Asia Pacific' },

  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', region: 'Middle East' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', region: 'Middle East' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', region: 'Middle East' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', region: 'Middle East' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', region: 'Middle East' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', region: 'Middle East' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', region: 'Middle East' },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£S', region: 'Middle East' },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', region: 'Middle East' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', region: 'Middle East' },

  { code: 'ZAR', name: 'South African Rand', symbol: 'R', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', region: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', region: 'Africa' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', region: 'Africa' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', region: 'Africa' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', region: 'Africa' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', region: 'Africa' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', region: 'Africa' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', region: 'Africa' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', region: 'Africa' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', region: 'Africa' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', region: 'Africa' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh', region: 'Africa' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', region: 'Africa' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', region: 'Africa' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', region: 'Africa' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L', region: 'Africa' },
  { code: 'SZL', name: 'Eswatini Lilangeni', symbol: 'E', region: 'Africa' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', region: 'Africa' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'Z$', region: 'Africa' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', region: 'Africa' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', region: 'Africa' },

  { code: 'XPF', name: 'CFP Franc', symbol: '₣', region: 'Other' },
] as const satisfies readonly CommonCurrency[];

export const COMMON_CURRENCY_CODES: string[] = COMMON_CURRENCIES.map((currency) => currency.code);

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', NZ: 'NZD',
  CN: 'CNY', SG: 'SGD', TW: 'TWD', HK: 'HKD', MO: 'MOP',
  JP: 'JPY', KR: 'KRW', IN: 'INR', TH: 'THB', VN: 'VND',
  ID: 'IDR', MY: 'MYR', PH: 'PHP', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR', LA: 'LAK',
  MN: 'MNT', BN: 'BND', FJ: 'FJD', PG: 'PGK', WS: 'WST',
  TO: 'TOP', KZ: 'KZT', UZ: 'UZS', TJ: 'TJS', KG: 'KGS',
  TM: 'TMT',
  DE: 'EUR', AT: 'EUR', CH: 'CHF', FR: 'EUR', BE: 'EUR',
  IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'HRK',
  RS: 'RSD', BA: 'BAM', MK: 'MKD', AL: 'ALL', IS: 'ISK',
  UA: 'UAH', BY: 'BYN', MD: 'MDL', GE: 'GEL', AM: 'AMD',
  AZ: 'AZN', RU: 'RUB', TR: 'TRY', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', FI: 'EUR', IE: 'EUR', GR: 'EUR', SK: 'EUR',
  SI: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR', LU: 'EUR',
  MT: 'EUR', CY: 'EUR', MC: 'EUR',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  PE: 'PEN', UY: 'UYU', BO: 'BOB', PY: 'PYG', VE: 'VES',
  CR: 'CRC', GT: 'GTQ', HN: 'HNL', NI: 'NIO', PA: 'PAB',
  DO: 'DOP', JM: 'JMD', TT: 'TTD', BB: 'BBD', BS: 'BSD',
  BZ: 'BZD', HT: 'HTG', EC: 'USD', SV: 'USD',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD',
  OM: 'OMR', JO: 'JOD', IL: 'ILS', IR: 'IRR', IQ: 'IQD',
  LB: 'LBP', SY: 'SYP', YE: 'YER', AF: 'AFN',
  ZA: 'ZAR', NG: 'NGN', EG: 'EGP', KE: 'KES', GH: 'GHS',
  TZ: 'TZS', UG: 'UGX', ET: 'ETB', MA: 'MAD', TN: 'TND',
  DZ: 'DZD', SN: 'XOF', CI: 'XOF', CM: 'XAF', RW: 'RWF',
  MG: 'MGA', SO: 'SOS', MU: 'MUR', NA: 'NAD', BW: 'BWP',
  LS: 'LSL', SZ: 'SZL', ZM: 'ZMW', ZW: 'ZWL', AO: 'AOA',
  MZ: 'MZN', NE: 'XOF',
};

const LANGUAGE_CURRENCY_OVERRIDES: Record<string, string> = {
  en: 'USD',
  'zh-CN': 'CNY',
  'zh-TW': 'TWD',
  'pt-BR': 'BRL',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  pt: 'EUR',
  nl: 'EUR',
  sv: 'SEK',
  da: 'DKK',
  nb: 'NOK',
  fi: 'EUR',
  pl: 'PLN',
  cs: 'CZK',
  hu: 'HUF',
  ro: 'RON',
  el: 'EUR',
  ru: 'RUB',
  uk: 'UAH',
  tr: 'TRY',
  ar: 'SAR',
  he: 'ILS',
  fa: 'IRR',
  hi: 'INR',
  bn: 'BDT',
  ur: 'PKR',
  ta: 'INR',
  te: 'INR',
  mr: 'INR',
  gu: 'INR',
  kn: 'INR',
  ml: 'INR',
  pa: 'INR',
  ne: 'NPR',
  si: 'LKR',
  ja: 'JPY',
  ko: 'KRW',
  th: 'THB',
  vi: 'VND',
  id: 'IDR',
  ms: 'MYR',
  fil: 'PHP',
  km: 'KHR',
  lo: 'LAK',
  my: 'MMK',
  mn: 'MNT',
  sw: 'KES',
  am: 'ETB',
  ha: 'NGN',
  yo: 'NGN',
  ig: 'NGN',
  zu: 'ZAR',
  xh: 'ZAR',
  af: 'ZAR',
  st: 'LSL',
  tn: 'BWP',
  so: 'SOS',
  rw: 'RWF',
  mg: 'MGA',
  ht: 'HTG',
  qu: 'PEN',
  gn: 'PYG',
  mi: 'NZD',
  sm: 'WST',
  to: 'TOP',
  fj: 'FJD',
  ku: 'IQD',
  az: 'AZN',
  ka: 'GEL',
  hy: 'AMD',
  kk: 'KZT',
  uz: 'UZS',
  tg: 'TJS',
  ky: 'KGS',
  tk: 'TMT',
};

export function getCommonCurrency(code: string) {
  return COMMON_CURRENCIES.find((currency) => currency.code === code) ?? null;
}

export function isCommonCurrencyCode(code: string) {
  return COMMON_CURRENCY_CODES.includes(code);
}

export function getDefaultCurrencyForLanguage(languageCode: string): string {
  if (LANGUAGE_CURRENCY_OVERRIDES[languageCode]) {
    return LANGUAGE_CURRENCY_OVERRIDES[languageCode];
  }

  const language = getCommonLanguage(languageCode);
  if (!language) {
    return 'USD';
  }

  for (const countryCode of language.countryCodes ?? []) {
    const currency = COUNTRY_CURRENCY_MAP[countryCode];
    if (currency) {
      return currency;
    }
  }

  return 'USD';
}

export function formatCurrencyLabel(code: string) {
  const currency = getCommonCurrency(code);
  if (!currency) {
    return code;
  }
  return `${currency.code} — ${currency.name}`;
}
