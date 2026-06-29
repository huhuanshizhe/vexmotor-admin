/** 非默认语言仅当主标题（name/title）有值时才纳入保存与校验。 */
export function shouldPersistLocaleDraft(options: {
  locale: string;
  defaultLocale: string;
  primaryText: string;
}): boolean {
  if (!options.defaultLocale) return Boolean(options.primaryText.trim());
  if (options.locale === options.defaultLocale) return true;
  return Boolean(options.primaryText.trim());
}
