import 'server-only';

import {
  blogAuthors,
  blogCategories,
  blogCategoryFromSlug,
  blogCategorySlug,
  blogIndustries,
  blogPageSize,
  blogPosts,
  blogProductTopicFromSlug,
  blogProductTopics,
  type BlogAuthor,
  type BlogCategory,
  type BlogIndustry,
  type BlogPost,
  type BlogProductTopic,
  filterByProductTopic,
} from '@/lib/blog';
import { buildBlogPostFromEntry } from '@/lib/editorial-content';
import { getPublishedAdminEditorialBlogEntries } from '@/server/admin/editorial-content';

export type BlogCatalog = {
  sourceMode: 'code-seeded' | 'admin-managed';
  authors: BlogAuthor[];
  categories: BlogCategory[];
  categorySlugs: Record<BlogCategory, string>;
  industries: BlogIndustry[];
  pageSize: number;
  posts: BlogPost[];
  productTopics: BlogProductTopic[];
  productTopicSlugs: Record<BlogProductTopic, string>;
};

export type BlogFilters = {
  query?: string;
  category?: string;
  industry?: string;
  author?: string;
  year?: string;
};

export async function getBlogCatalog(locale = 'en-US'): Promise<BlogCatalog> {
  const adminEntries = await getPublishedAdminEditorialBlogEntries(locale);
  const mergedPosts = new Map(blogPosts.map((post) => [post.slug, post]));

  for (const entry of adminEntries) {
    mergedPosts.set(entry.slug, buildBlogPostFromEntry(entry));
  }

  return {
    sourceMode: adminEntries.length ? 'admin-managed' : 'code-seeded',
    authors: [...blogAuthors],
    categories: [...blogCategories],
    categorySlugs: { ...blogCategorySlug },
    industries: [...blogIndustries],
    pageSize: blogPageSize,
    posts: Array.from(mergedPosts.values()).sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)),
    productTopics: [...blogProductTopics],
    productTopicSlugs: Object.fromEntries(
      blogProductTopics.map((topic) => {
        const slug = Object.entries(blogProductTopicFromSlug).find(([, v]) => v === topic)?.[0];
        return [topic, slug ?? topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')];
      }),
    ) as Record<BlogProductTopic, string>,
  };
}

export async function getPublishedBlogPosts(locale = 'en-US') {
  const catalog = await getBlogCatalog(locale);
  return catalog.posts;
}

export function getBlogAuthorById(catalog: BlogCatalog, authorId: string) {
  return catalog.authors.find((author) => author.id === authorId);
}

export function getBlogPostBySlug(catalog: BlogCatalog, slug: string) {
  return catalog.posts.find((post) => post.slug === slug);
}

export function getBlogYears(catalog: BlogCatalog) {
  return Array.from(new Set(catalog.posts.map((post) => new Date(post.publishedAt).getUTCFullYear().toString()))).sort((left, right) => Number(right) - Number(left));
}

export function filterBlogPosts(catalog: BlogCatalog, filters: BlogFilters) {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return catalog.posts.filter((post) => {
    const author = getBlogAuthorById(catalog, post.authorId);
    const matchesQuery = !query || `${post.title} ${post.seoTitle ?? ''} ${post.summary} ${post.seoDescription ?? ''} ${post.lead} ${author?.name ?? ''}`.toLowerCase().includes(query);
    const matchesCategory = !filters.category || blogCategorySlug[post.category] === filters.category;
    const matchesIndustry = !filters.industry || post.industry === filters.industry;
    const matchesAuthor = !filters.author || post.authorId === filters.author;
    const matchesYear = !filters.year || new Date(post.publishedAt).getUTCFullYear().toString() === filters.year;

    return matchesQuery && matchesCategory && matchesIndustry && matchesAuthor && matchesYear;
  });
}

export function getPostsByProductTopic(catalog: BlogCatalog, topicSlug: string) {
  const topic = blogProductTopicFromSlug[topicSlug];
  if (!topic) return [];
  return filterByProductTopic(catalog.posts, topic);
}

export function getProductTopicBySlug(topicSlug: string): BlogProductTopic | undefined {
  return blogProductTopicFromSlug[topicSlug];
}

export function paginateBlogPosts(posts: BlogPost[], page: number, pageSize = blogPageSize) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    totalPages,
    items: posts.slice(startIndex, startIndex + pageSize),
  };
}

export function getMostReadPosts(catalog: BlogCatalog, limit = 4) {
  return [...catalog.posts].sort((left, right) => right.viewCount - left.viewCount).slice(0, limit);
}

export function getRelatedPosts(catalog: BlogCatalog, post: BlogPost, limit = 3) {
  return post.relatedPostSlugs
    .map((slug) => getBlogPostBySlug(catalog, slug))
    .filter((item): item is BlogPost => Boolean(item))
    .slice(0, limit);
}

export function getCategoryCounts(catalog: BlogCatalog) {
  return catalog.categories.map((category) => ({
    category,
    slug: blogCategorySlug[category],
    count: catalog.posts.filter((post) => post.category === category).length,
  }));
}

export function getProductTopicCounts(catalog: BlogCatalog) {
  return catalog.productTopics.map((topic) => ({
    topic,
    slug: catalog.productTopicSlugs[topic] ?? topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    count: catalog.posts.filter((post) => post.productTopics.includes(topic)).length,
  }));
}
