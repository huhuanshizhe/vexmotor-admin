/** 博客英文内置分类（与前台 vexmotor-web blogCategories 一致） */
export const blogCategoriesEn = [
  'Technical Guide',
  'Application Note',
  'Tutorial',
  'News & Updates',
] as const;

export type BlogCategoryEn = (typeof blogCategoriesEn)[number];

/** 每个内置分类对应唯一 URL slug（用于 ?category=application-note 等） */
export const blogCategorySlug: Record<BlogCategoryEn, string> = {
  'Technical Guide': 'technical-guide',
  'Application Note': 'application-note',
  'Tutorial': 'tutorial',
  'News & Updates': 'news',
};

export const blogCategoryFromSlug = Object.fromEntries(
  Object.entries(blogCategorySlug).map(([label, slug]) => [slug, label]),
) as Record<string, BlogCategoryEn>;

export const blogCategoryCatalog = blogCategoriesEn.map((label) => ({
  label,
  slug: blogCategorySlug[label],
}));

export const blogCategorySelectOptions = blogCategoryCatalog.map((item) => ({
  value: item.label,
  label: `${item.label} (${item.slug})`,
}));

export function isEnglishEditorialLocale(locale: string) {
  return locale.toLowerCase().startsWith('en');
}

export function isBlogCategoryEn(value: string): value is BlogCategoryEn {
  return (blogCategoriesEn as readonly string[]).includes(value);
}

/** 由分类显示名或 slug 解析为唯一 category slug；自定义分类返回 null */
export function resolveBlogCategorySlug(category: string | null | undefined): string | null {
  if (!category?.trim()) return null;
  const normalized = category.trim();
  if (isBlogCategoryEn(normalized)) {
    return blogCategorySlug[normalized];
  }
  if (normalized in blogCategoryFromSlug) {
    return normalized;
  }
  return null;
}
