export type LanguageDirection = 'ltr' | 'rtl';

export type LanguageRegion =
  | 'Global'
  | 'Europe'
  | 'South Asia'
  | 'Southeast Asia'
  | 'Middle East & Central Asia'
  | 'Africa'
  | 'Americas & Oceania';

export type CommonLanguage = {
  code: string;
  name: string;
  nativeName: string;
  region: LanguageRegion;
  direction: LanguageDirection;
  countryCodes?: string[];
};

export const COMMON_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global', direction: 'ltr', countryCodes: ['US', 'GB', 'AU', 'CA', 'NZ'] },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'Global', direction: 'ltr', countryCodes: ['CN', 'SG'] },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'Global', direction: 'ltr', countryCodes: ['TW', 'HK', 'MO'] },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'Global', direction: 'ltr', countryCodes: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'] },
  { code: 'fr', name: 'French', nativeName: 'Français', region: 'Global', direction: 'ltr', countryCodes: ['FR', 'CA', 'BE', 'CH'] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', region: 'Global', direction: 'ltr', countryCodes: ['DE', 'AT', 'CH'] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', region: 'Global', direction: 'ltr', countryCodes: ['IT', 'CH'] },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'Global', direction: 'ltr', countryCodes: ['PT', 'AO', 'MZ'] },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', region: 'Global', direction: 'ltr', countryCodes: ['BR'] },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'Global', direction: 'ltr', countryCodes: ['RU'] },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'Global', direction: 'ltr', countryCodes: ['JP'] },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'Global', direction: 'ltr', countryCodes: ['KR'] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Global', direction: 'rtl', countryCodes: ['SA', 'AE', 'EG', 'MA'] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'Global', direction: 'ltr', countryCodes: ['IN'] },

  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', region: 'Europe', direction: 'ltr', countryCodes: ['NL', 'BE'] },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', region: 'Europe', direction: 'ltr', countryCodes: ['PL'] },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'Europe', direction: 'ltr', countryCodes: ['TR'] },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', region: 'Europe', direction: 'ltr', countryCodes: ['SE'] },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', region: 'Europe', direction: 'ltr', countryCodes: ['DK'] },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', region: 'Europe', direction: 'ltr', countryCodes: ['NO'] },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', region: 'Europe', direction: 'ltr', countryCodes: ['FI'] },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', region: 'Europe', direction: 'ltr', countryCodes: ['CZ'] },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', region: 'Europe', direction: 'ltr', countryCodes: ['SK'] },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', region: 'Europe', direction: 'ltr', countryCodes: ['HU'] },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', region: 'Europe', direction: 'ltr', countryCodes: ['RO', 'MD'] },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', region: 'Europe', direction: 'ltr', countryCodes: ['BG'] },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', region: 'Europe', direction: 'ltr', countryCodes: ['GR', 'CY'] },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', region: 'Europe', direction: 'ltr', countryCodes: ['UA'] },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', region: 'Europe', direction: 'ltr', countryCodes: ['HR'] },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', region: 'Europe', direction: 'ltr', countryCodes: ['RS'] },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', region: 'Europe', direction: 'ltr', countryCodes: ['SI'] },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', region: 'Europe', direction: 'ltr', countryCodes: ['LT'] },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', region: 'Europe', direction: 'ltr', countryCodes: ['LV'] },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', region: 'Europe', direction: 'ltr', countryCodes: ['EE'] },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', region: 'Europe', direction: 'ltr', countryCodes: ['IE'] },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', region: 'Europe', direction: 'ltr', countryCodes: ['IS'] },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', region: 'Europe', direction: 'ltr', countryCodes: ['MT'] },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', region: 'Europe', direction: 'ltr', countryCodes: ['AL', 'XK'] },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', region: 'Europe', direction: 'ltr', countryCodes: ['MK'] },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', region: 'Europe', direction: 'ltr', countryCodes: ['BA'] },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', region: 'Europe', direction: 'ltr', countryCodes: ['ES', 'AD'] },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', region: 'Europe', direction: 'ltr', countryCodes: ['ES', 'FR'] },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', region: 'Europe', direction: 'ltr', countryCodes: ['ES'] },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', region: 'Europe', direction: 'ltr', countryCodes: ['GB'] },

  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'South Asia', direction: 'ltr', countryCodes: ['BD', 'IN'] },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'South Asia', direction: 'rtl', countryCodes: ['PK', 'IN'] },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'South Asia', direction: 'ltr', countryCodes: ['IN', 'LK', 'SG'] },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'South Asia', direction: 'ltr', countryCodes: ['IN'] },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'South Asia', direction: 'ltr', countryCodes: ['IN'] },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'South Asia', direction: 'ltr', countryCodes: ['IN'] },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'South Asia', direction: 'ltr', countryCodes: ['IN'] },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'South Asia', direction: 'ltr', countryCodes: ['IN'] },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'South Asia', direction: 'ltr', countryCodes: ['IN', 'PK'] },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', region: 'South Asia', direction: 'ltr', countryCodes: ['LK'] },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'South Asia', direction: 'ltr', countryCodes: ['NP'] },

  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['ID'] },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['MY', 'BN', 'SG'] },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['VN'] },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['TH'] },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['PH'] },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['KH'] },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['LA'] },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['MM'] },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', region: 'Southeast Asia', direction: 'ltr', countryCodes: ['MN'] },

  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'Middle East & Central Asia', direction: 'rtl', countryCodes: ['IR', 'AF'] },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', region: 'Middle East & Central Asia', direction: 'rtl', countryCodes: ['IL'] },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', region: 'Middle East & Central Asia', direction: 'rtl', countryCodes: ['IQ', 'TR', 'IR', 'SY'] },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['AZ'] },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['GE'] },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['AM'] },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['KZ'] },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['UZ'] },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['TJ'] },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргыз', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['KG'] },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen', region: 'Middle East & Central Asia', direction: 'ltr', countryCodes: ['TM'] },

  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', region: 'Africa', direction: 'ltr', countryCodes: ['KE', 'TZ', 'UG'] },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', region: 'Africa', direction: 'ltr', countryCodes: ['ET'] },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', region: 'Africa', direction: 'ltr', countryCodes: ['NG', 'NE'] },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', region: 'Africa', direction: 'ltr', countryCodes: ['NG'] },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', region: 'Africa', direction: 'ltr', countryCodes: ['NG'] },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', region: 'Africa', direction: 'ltr', countryCodes: ['ZA'] },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', region: 'Africa', direction: 'ltr', countryCodes: ['ZA'] },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', region: 'Africa', direction: 'ltr', countryCodes: ['ZA', 'NA'] },
  { code: 'st', name: 'Southern Sotho', nativeName: 'Sesotho', region: 'Africa', direction: 'ltr', countryCodes: ['LS', 'ZA'] },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', region: 'Africa', direction: 'ltr', countryCodes: ['BW', 'ZA'] },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', region: 'Africa', direction: 'ltr', countryCodes: ['SO'] },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda', region: 'Africa', direction: 'ltr', countryCodes: ['RW'] },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', region: 'Africa', direction: 'ltr', countryCodes: ['MG'] },

  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['HT'] },
  { code: 'qu', name: 'Quechua', nativeName: 'Runasimi', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['PE', 'BO', 'EC'] },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['PY'] },
  { code: 'mi', name: 'Māori', nativeName: 'Māori', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['NZ'] },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['WS', 'AS'] },
  { code: 'to', name: 'Tongan', nativeName: 'Lea faka-Tonga', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['TO'] },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti', region: 'Americas & Oceania', direction: 'ltr', countryCodes: ['FJ'] },
] as const satisfies readonly CommonLanguage[];

export const COMMON_LANGUAGE_CODES: string[] = COMMON_LANGUAGES.map((language) => language.code);

export function getCommonLanguage(code: string) {
  return COMMON_LANGUAGES.find((language) => language.code === code) ?? null;
}

export function isCommonLanguageCode(code: string) {
  return COMMON_LANGUAGE_CODES.includes(code);
}
