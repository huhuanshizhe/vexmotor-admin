import { getCommonLanguage } from '@/lib/languages';

export type CurrencyRegion = 'Major' | 'Americas' | 'Europe' | 'Asia Pacific' | 'Middle East' | 'Africa' | 'Other';

export type CommonCurrency = {
  code: string;
  name: string;
  nameZh: string;
  symbol: string;
  region: CurrencyRegion;
};

export const CURRENCY_REGION_LABELS_ZH: Record<CurrencyRegion, string> = {
  Major: '主要货币',
  Americas: '美洲',
  Europe: '欧洲',
  'Asia Pacific': '亚太',
  'Middle East': '中东',
  Africa: '非洲',
  Other: '其他',
};

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', nameZh: '美元', symbol: '$', region: 'Major' },
  { code: 'EUR', name: 'Euro', nameZh: '欧元', symbol: '€', region: 'Major' },
  { code: 'GBP', name: 'British Pound', nameZh: '英镑', symbol: '£', region: 'Major' },
  { code: 'JPY', name: 'Japanese Yen', nameZh: '日元', symbol: '¥', region: 'Major' },
  { code: 'CNY', name: 'Chinese Yuan', nameZh: '人民币', symbol: '¥', region: 'Major' },
  { code: 'CHF', name: 'Swiss Franc', nameZh: '瑞士法郎', symbol: 'CHF', region: 'Major' },
  { code: 'CAD', name: 'Canadian Dollar', nameZh: '加拿大元', symbol: 'CA$', region: 'Major' },
  { code: 'AUD', name: 'Australian Dollar', nameZh: '澳大利亚元', symbol: 'A$', region: 'Major' },
  { code: 'NZD', name: 'New Zealand Dollar', nameZh: '新西兰元', symbol: 'NZ$', region: 'Major' },
  { code: 'HKD', name: 'Hong Kong Dollar', nameZh: '港元', symbol: 'HK$', region: 'Major' },
  { code: 'SGD', name: 'Singapore Dollar', nameZh: '新加坡元', symbol: 'S$', region: 'Major' },
  { code: 'KRW', name: 'South Korean Won', nameZh: '韩元', symbol: '₩', region: 'Major' },
  { code: 'INR', name: 'Indian Rupee', nameZh: '印度卢比', symbol: '₹', region: 'Major' },
  { code: 'SEK', name: 'Swedish Krona', nameZh: '瑞典克朗', symbol: 'kr', region: 'Major' },
  { code: 'NOK', name: 'Norwegian Krone', nameZh: '挪威克朗', symbol: 'kr', region: 'Major' },
  { code: 'DKK', name: 'Danish Krone', nameZh: '丹麦克朗', symbol: 'kr', region: 'Major' },

  { code: 'MXN', name: 'Mexican Peso', nameZh: '墨西哥比索', symbol: 'MX$', region: 'Americas' },
  { code: 'BRL', name: 'Brazilian Real', nameZh: '巴西雷亚尔', symbol: 'R$', region: 'Americas' },
  { code: 'ARS', name: 'Argentine Peso', nameZh: '阿根廷比索', symbol: 'AR$', region: 'Americas' },
  { code: 'CLP', name: 'Chilean Peso', nameZh: '智利比索', symbol: 'CL$', region: 'Americas' },
  { code: 'COP', name: 'Colombian Peso', nameZh: '哥伦比亚比索', symbol: 'COL$', region: 'Americas' },
  { code: 'PEN', name: 'Peruvian Sol', nameZh: '秘鲁索尔', symbol: 'S/', region: 'Americas' },
  { code: 'UYU', name: 'Uruguayan Peso', nameZh: '乌拉圭比索', symbol: '$U', region: 'Americas' },
  { code: 'BOB', name: 'Bolivian Boliviano', nameZh: '玻利维亚诺', symbol: 'Bs.', region: 'Americas' },
  { code: 'PYG', name: 'Paraguayan Guaraní', nameZh: '巴拉圭瓜拉尼', symbol: '₲', region: 'Americas' },
  { code: 'VES', name: 'Venezuelan Bolívar', nameZh: '委内瑞拉玻利瓦尔', symbol: 'Bs.', region: 'Americas' },
  { code: 'CRC', name: 'Costa Rican Colón', nameZh: '哥斯达黎加科朗', symbol: '₡', region: 'Americas' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', nameZh: '危地马拉格查尔', symbol: 'Q', region: 'Americas' },
  { code: 'HNL', name: 'Honduran Lempira', nameZh: '洪都拉斯伦皮拉', symbol: 'L', region: 'Americas' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', nameZh: '尼加拉瓜科多巴', symbol: 'C$', region: 'Americas' },
  { code: 'PAB', name: 'Panamanian Balboa', nameZh: '巴拿马巴波亚', symbol: 'B/.', region: 'Americas' },
  { code: 'DOP', name: 'Dominican Peso', nameZh: '多米尼加比索', symbol: 'RD$', region: 'Americas' },
  { code: 'JMD', name: 'Jamaican Dollar', nameZh: '牙买加元', symbol: 'J$', region: 'Americas' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', nameZh: '特立尼达和多巴哥元', symbol: 'TT$', region: 'Americas' },
  { code: 'BBD', name: 'Barbadian Dollar', nameZh: '巴巴多斯元', symbol: 'Bds$', region: 'Americas' },
  { code: 'BSD', name: 'Bahamian Dollar', nameZh: '巴哈马元', symbol: 'B$', region: 'Americas' },
  { code: 'BZD', name: 'Belize Dollar', nameZh: '伯利兹元', symbol: 'BZ$', region: 'Americas' },
  { code: 'HTG', name: 'Haitian Gourde', nameZh: '海地古德', symbol: 'G', region: 'Americas' },
  { code: 'XCD', name: 'East Caribbean Dollar', nameZh: '东加勒比元', symbol: 'EC$', region: 'Americas' },

  { code: 'PLN', name: 'Polish Złoty', nameZh: '波兰兹罗提', symbol: 'zł', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', nameZh: '捷克克朗', symbol: 'Kč', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', nameZh: '匈牙利福林', symbol: 'Ft', region: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', nameZh: '罗马尼亚列伊', symbol: 'lei', region: 'Europe' },
  { code: 'BGN', name: 'Bulgarian Lev', nameZh: '保加利亚列弗', symbol: 'лв', region: 'Europe' },
  { code: 'HRK', name: 'Croatian Kuna', nameZh: '克罗地亚库纳', symbol: 'kn', region: 'Europe' },
  { code: 'RSD', name: 'Serbian Dinar', nameZh: '塞尔维亚第纳尔', symbol: 'дин', region: 'Europe' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', nameZh: '波黑可兑换马克', symbol: 'KM', region: 'Europe' },
  { code: 'MKD', name: 'Macedonian Denar', nameZh: '北马其顿第纳尔', symbol: 'ден', region: 'Europe' },
  { code: 'ALL', name: 'Albanian Lek', nameZh: '阿尔巴尼亚列克', symbol: 'L', region: 'Europe' },
  { code: 'ISK', name: 'Icelandic Króna', nameZh: '冰岛克朗', symbol: 'kr', region: 'Europe' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', nameZh: '乌克兰格里夫纳', symbol: '₴', region: 'Europe' },
  { code: 'BYN', name: 'Belarusian Ruble', nameZh: '白俄罗斯卢布', symbol: 'Br', region: 'Europe' },
  { code: 'MDL', name: 'Moldovan Leu', nameZh: '摩尔多瓦列伊', symbol: 'L', region: 'Europe' },
  { code: 'GEL', name: 'Georgian Lari', nameZh: '格鲁吉亚拉里', symbol: '₾', region: 'Europe' },
  { code: 'AMD', name: 'Armenian Dram', nameZh: '亚美尼亚德拉姆', symbol: '֏', region: 'Europe' },
  { code: 'AZN', name: 'Azerbaijani Manat', nameZh: '阿塞拜疆马纳特', symbol: '₼', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', nameZh: '俄罗斯卢布', symbol: '₽', region: 'Europe' },
  { code: 'TRY', name: 'Turkish Lira', nameZh: '土耳其里拉', symbol: '₺', region: 'Europe' },

  { code: 'TWD', name: 'New Taiwan Dollar', nameZh: '新台币', symbol: 'NT$', region: 'Asia Pacific' },
  { code: 'THB', name: 'Thai Baht', nameZh: '泰铢', symbol: '฿', region: 'Asia Pacific' },
  { code: 'VND', name: 'Vietnamese Dong', nameZh: '越南盾', symbol: '₫', region: 'Asia Pacific' },
  { code: 'IDR', name: 'Indonesian Rupiah', nameZh: '印尼盾', symbol: 'Rp', region: 'Asia Pacific' },
  { code: 'MYR', name: 'Malaysian Ringgit', nameZh: '马来西亚林吉特', symbol: 'RM', region: 'Asia Pacific' },
  { code: 'PHP', name: 'Philippine Peso', nameZh: '菲律宾比索', symbol: '₱', region: 'Asia Pacific' },
  { code: 'PKR', name: 'Pakistani Rupee', nameZh: '巴基斯坦卢比', symbol: '₨', region: 'Asia Pacific' },
  { code: 'BDT', name: 'Bangladeshi Taka', nameZh: '孟加拉塔卡', symbol: '৳', region: 'Asia Pacific' },
  { code: 'LKR', name: 'Sri Lankan Rupee', nameZh: '斯里兰卡卢比', symbol: 'Rs', region: 'Asia Pacific' },
  { code: 'NPR', name: 'Nepalese Rupee', nameZh: '尼泊尔卢比', symbol: 'Rs', region: 'Asia Pacific' },
  { code: 'MMK', name: 'Myanmar Kyat', nameZh: '缅甸元', symbol: 'K', region: 'Asia Pacific' },
  { code: 'KHR', name: 'Cambodian Riel', nameZh: '柬埔寨瑞尔', symbol: '៛', region: 'Asia Pacific' },
  { code: 'LAK', name: 'Lao Kip', nameZh: '老挝基普', symbol: '₭', region: 'Asia Pacific' },
  { code: 'MNT', name: 'Mongolian Tögrög', nameZh: '蒙古图格里克', symbol: '₮', region: 'Asia Pacific' },
  { code: 'MOP', name: 'Macanese Pataca', nameZh: '澳门元', symbol: 'MOP$', region: 'Asia Pacific' },
  { code: 'BND', name: 'Brunei Dollar', nameZh: '文莱元', symbol: 'B$', region: 'Asia Pacific' },
  { code: 'FJD', name: 'Fijian Dollar', nameZh: '斐济元', symbol: 'FJ$', region: 'Asia Pacific' },
  { code: 'PGK', name: 'Papua New Guinean Kina', nameZh: '巴布亚新几内亚基那', symbol: 'K', region: 'Asia Pacific' },
  { code: 'WST', name: 'Samoan Tālā', nameZh: '萨摩亚塔拉', symbol: 'T', region: 'Asia Pacific' },
  { code: 'TOP', name: 'Tongan Paʻanga', nameZh: '汤加潘加', symbol: 'T$', region: 'Asia Pacific' },
  { code: 'KZT', name: 'Kazakhstani Tenge', nameZh: '哈萨克斯坦坚戈', symbol: '₸', region: 'Asia Pacific' },
  { code: 'UZS', name: 'Uzbekistani Som', nameZh: '乌兹别克斯坦苏姆', symbol: 'soʻm', region: 'Asia Pacific' },
  { code: 'TJS', name: 'Tajikistani Somoni', nameZh: '塔吉克斯坦索莫尼', symbol: 'SM', region: 'Asia Pacific' },
  { code: 'KGS', name: 'Kyrgyzstani Som', nameZh: '吉尔吉斯斯坦索姆', symbol: 'с', region: 'Asia Pacific' },
  { code: 'TMT', name: 'Turkmenistani Manat', nameZh: '土库曼斯坦马纳特', symbol: 'm', region: 'Asia Pacific' },

  { code: 'AED', name: 'UAE Dirham', nameZh: '阿联酋迪拉姆', symbol: 'د.إ', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', nameZh: '沙特里亚尔', symbol: '﷼', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', nameZh: '卡塔尔里亚尔', symbol: '﷼', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameZh: '科威特第纳尔', symbol: 'د.ك', region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar', nameZh: '巴林第纳尔', symbol: '.د.ب', region: 'Middle East' },
  { code: 'OMR', name: 'Omani Rial', nameZh: '阿曼里亚尔', symbol: '﷼', region: 'Middle East' },
  { code: 'JOD', name: 'Jordanian Dinar', nameZh: '约旦第纳尔', symbol: 'JD', region: 'Middle East' },
  { code: 'ILS', name: 'Israeli New Shekel', nameZh: '以色列新谢克尔', symbol: '₪', region: 'Middle East' },
  { code: 'IRR', name: 'Iranian Rial', nameZh: '伊朗里亚尔', symbol: '﷼', region: 'Middle East' },
  { code: 'IQD', name: 'Iraqi Dinar', nameZh: '伊拉克第纳尔', symbol: 'ع.د', region: 'Middle East' },
  { code: 'LBP', name: 'Lebanese Pound', nameZh: '黎巴嫩镑', symbol: 'ل.ل', region: 'Middle East' },
  { code: 'SYP', name: 'Syrian Pound', nameZh: '叙利亚镑', symbol: '£S', region: 'Middle East' },
  { code: 'YER', name: 'Yemeni Rial', nameZh: '也门里亚尔', symbol: '﷼', region: 'Middle East' },
  { code: 'AFN', name: 'Afghan Afghani', nameZh: '阿富汗尼', symbol: '؋', region: 'Middle East' },

  { code: 'ZAR', name: 'South African Rand', nameZh: '南非兰特', symbol: 'R', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', nameZh: '尼日利亚奈拉', symbol: '₦', region: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', nameZh: '埃及镑', symbol: 'E£', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', nameZh: '肯尼亚先令', symbol: 'KSh', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', nameZh: '加纳塞地', symbol: '₵', region: 'Africa' },
  { code: 'TZS', name: 'Tanzanian Shilling', nameZh: '坦桑尼亚先令', symbol: 'TSh', region: 'Africa' },
  { code: 'UGX', name: 'Ugandan Shilling', nameZh: '乌干达先令', symbol: 'USh', region: 'Africa' },
  { code: 'ETB', name: 'Ethiopian Birr', nameZh: '埃塞俄比亚比尔', symbol: 'Br', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', nameZh: '摩洛哥迪拉姆', symbol: 'د.م.', region: 'Africa' },
  { code: 'TND', name: 'Tunisian Dinar', nameZh: '突尼斯第纳尔', symbol: 'د.ت', region: 'Africa' },
  { code: 'DZD', name: 'Algerian Dinar', nameZh: '阿尔及利亚第纳尔', symbol: 'د.ج', region: 'Africa' },
  { code: 'XOF', name: 'West African CFA Franc', nameZh: '西非法郎', symbol: 'CFA', region: 'Africa' },
  { code: 'XAF', name: 'Central African CFA Franc', nameZh: '中非法郎', symbol: 'FCFA', region: 'Africa' },
  { code: 'RWF', name: 'Rwandan Franc', nameZh: '卢旺达法郎', symbol: 'FRw', region: 'Africa' },
  { code: 'MGA', name: 'Malagasy Ariary', nameZh: '马达加斯加阿里亚里', symbol: 'Ar', region: 'Africa' },
  { code: 'SOS', name: 'Somali Shilling', nameZh: '索马里先令', symbol: 'Sh', region: 'Africa' },
  { code: 'MUR', name: 'Mauritian Rupee', nameZh: '毛里求斯卢比', symbol: '₨', region: 'Africa' },
  { code: 'NAD', name: 'Namibian Dollar', nameZh: '纳米比亚元', symbol: 'N$', region: 'Africa' },
  { code: 'BWP', name: 'Botswana Pula', nameZh: '博茨瓦纳普拉', symbol: 'P', region: 'Africa' },
  { code: 'LSL', name: 'Lesotho Loti', nameZh: '莱索托洛蒂', symbol: 'L', region: 'Africa' },
  { code: 'SZL', name: 'Eswatini Lilangeni', nameZh: '斯威士兰里兰吉尼', symbol: 'E', region: 'Africa' },
  { code: 'ZMW', name: 'Zambian Kwacha', nameZh: '赞比亚克瓦查', symbol: 'ZK', region: 'Africa' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', nameZh: '津巴布韦元', symbol: 'Z$', region: 'Africa' },
  { code: 'AOA', name: 'Angolan Kwanza', nameZh: '安哥拉宽扎', symbol: 'Kz', region: 'Africa' },
  { code: 'MZN', name: 'Mozambican Metical', nameZh: '莫桑比克梅蒂卡尔', symbol: 'MT', region: 'Africa' },

  { code: 'XPF', name: 'CFP Franc', nameZh: '太平洋法郎', symbol: '₣', region: 'Other' },
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
  return `${currency.code} — ${currency.name} — ${currency.nameZh}`;
}

export function getCommonCurrencyGroupedSelectOptions() {
  const grouped = new Map<string, CommonCurrency[]>();
  for (const currency of COMMON_CURRENCIES) {
    grouped.set(currency.region, [...(grouped.get(currency.region) ?? []), currency]);
  }

  return Array.from(grouped.entries()).map(([region, options]) => ({
    label: CURRENCY_REGION_LABELS_ZH[region as CurrencyRegion] ?? region,
    options: options.map((currency) => ({
      value: currency.code,
      label: formatCurrencyLabel(currency.code),
    })),
  }));
}
