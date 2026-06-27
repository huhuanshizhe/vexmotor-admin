/** 博客英文内置分类（与前台 vexmotor-web blogCategories 一致） */
export const blogCategoriesEn = [
  'Technical Guide',
  'Application Note',
  'Tutorial',
  'News & Updates',
] as const;

export type BlogCategoryEn = (typeof blogCategoriesEn)[number];

export const blogCategorySelectOptions = blogCategoriesEn.map((value) => ({
  value,
  label: value,
}));

export function isEnglishEditorialLocale(locale: string) {
  return locale.toLowerCase().startsWith('en');
}
