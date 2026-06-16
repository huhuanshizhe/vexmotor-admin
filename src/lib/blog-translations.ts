/**
 * Blog post translation utilities
 * Handles loading and caching blog post translations
 */

import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n';

// Blog translation cache
const blogTranslationCache = new Map<string, BlogTranslation>();

export type BlogTranslation = {
  postId: string;
  locale: Locale;
  title?: string;
  excerpt?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
};

/**
 * Get blog post translation for a specific locale
 */
export async function getBlogTranslation(
  postId: string,
  locale: Locale,
  fallback = true
): Promise<BlogTranslation | null> {
  const cacheKey = `${postId}_${locale}`;
  
  // Check cache first
  const cached = blogTranslationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // In production, this would query the database:
    // const translation = await db.query.blogTranslations.findFirst({
    //   where: (t, { eq, and }) => and(eq(t.postId, postId), eq(t.locale, locale)),
    // });
    
    // For now, return null (will use English fallback)
    const translation = null;
    
    if (translation) {
      blogTranslationCache.set(cacheKey, translation);
      return translation;
    }
    
    // Fallback to default locale
    if (fallback && locale !== DEFAULT_LOCALE) {
      return getBlogTranslation(postId, DEFAULT_LOCALE, false);
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to load blog translation for ${postId} (${locale}):`, error);
    return null;
  }
}

/**
 * Get localized blog title
 */
export async function getLocalizedBlogTitle(
  post: { id: string; title: string },
  locale: Locale
): Promise<string> {
  const translation = await getBlogTranslation(post.id, locale);
  return translation?.title || post.title;
}

/**
 * Get localized blog content
 */
export async function getLocalizedBlogContent(
  post: { id: string; content: string },
  locale: Locale
): Promise<string> {
  const translation = await getBlogTranslation(post.id, locale);
  return translation?.content || post.content;
}

/**
 * Get localized blog slug
 */
export async function getLocalizedBlogSlug(
  post: { id: string; slug: string },
  locale: Locale
): Promise<string> {
  const translation = await getBlogTranslation(post.id, locale);
  return translation?.slug || post.slug;
}

/**
 * Bulk load blog translations
 */
export async function getBlogTranslations(
  postIds: string[],
  locale: Locale
): Promise<Map<string, BlogTranslation>> {
  const results = new Map<string, BlogTranslation>();
  
  const promises = postIds.map(async (id) => {
    const translation = await getBlogTranslation(id, locale);
    if (translation) {
      results.set(id, translation);
    }
  });
  
  await Promise.all(promises);
  return results;
}

/**
 * Clear blog translation cache
 */
export function clearBlogTranslationCache(postId?: string) {
  if (postId) {
    for (const locale of ['en', 'de', 'es']) {
      blogTranslationCache.delete(`${postId}_${locale}`);
    }
  } else {
    blogTranslationCache.clear();
  }
}

/**
 * Preload blog translations
 */
export async function preloadBlogTranslations(
  postIds: string[],
  locales: Locale[] = ['en', 'de', 'es']
) {
  const promises = locales.flatMap((locale) =>
    postIds.map((id) => getBlogTranslation(id, locale))
  );
  
  await Promise.all(promises);
}
