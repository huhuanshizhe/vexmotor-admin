import type { Metadata } from 'next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, withLocalePath } from '@/lib/i18n';
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE, SITE_NAME, SITE_URL } from '@/lib/site-config';

type SeoImage = {
  url: string;
  alt?: string;
};

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  locale?: Locale;
  type?: 'website' | 'article';
  images?: SeoImage[];
  noIndex?: boolean;
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

function toAbsoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

function buildAlternateLanguages(pathname: string) {
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, toAbsoluteUrl(withLocalePath(pathname, locale))]),
  );

  return {
    ...languages,
    'x-default': toAbsoluteUrl(withLocalePath(pathname, DEFAULT_LOCALE)),
  };
}

export function buildMetadata({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  path = '/',
  locale = DEFAULT_LOCALE,
  type = 'website',
  images,
  noIndex = false,
}: SeoInput = {}): Metadata {
  const localizedPath = withLocalePath(path, locale);
  const canonical = toAbsoluteUrl(localizedPath);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical,
      languages: buildAlternateLanguages(path),
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: images?.length ? images : undefined,
    },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images?.length ? [images[0].url] : undefined,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}

export function buildOrganizationJsonLd(locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    brand: SITE_NAME,
    inLanguage: locale,
  };
}

export function buildWebsiteJsonLd(locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: locale,
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(withLocalePath(item.path, locale)),
    })),
    inLanguage: locale,
  };
}

/**
 * Build Product schema.org structured data for product detail pages.
 * Supports aggregateRating, offers, and brand information.
 */
export function buildProductJsonLd(input: {
  name: string;
  description: string;
  sku: string;
  brand?: string;
  image?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  ratingValue?: number;
  ratingCount?: number;
  url?: string;
}) {
  const offers = input.price
    ? {
        '@type': 'Offer' as const,
        price: input.price,
        priceCurrency: input.currency ?? 'USD',
        availability: input.availability
          ? `https://schema.org/${input.availability}`
          : 'https://schema.org/InStock',
        url: input.url,
      }
    : undefined;

  const aggregateRating = input.ratingValue && input.ratingCount
    ? {
        '@type': 'AggregateRating' as const,
        ratingValue: input.ratingValue,
        reviewCount: input.ratingCount,
        bestRating: 5,
        worstRating: 1,
      }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product' as const,
    name: input.name,
    description: input.description,
    sku: input.sku,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    image: input.image,
    url: input.url,
    offers,
    aggregateRating,
  };
}

/**
 * Build Article schema.org structured data for blog posts and news.
 */
export function buildArticleJsonLd(input: {
  headline: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article' as const,
    headline: input.headline,
    description: input.description,
    author: {
      '@type': 'Organization' as const,
      name: input.author,
    },
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    image: input.image,
    url: input.url,
    publisher: {
      '@type': 'Organization' as const,
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject' as const,
        url: `${SITE_URL}/brand/stepmotech-logo-v2.svg`,
      },
    },
  };
}

/**
 * Build FAQPage schema.org structured data for FAQ pages.
 */
export function buildFaqPageJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage' as const,
    mainEntity: items.map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.answer,
      },
    })),
  };
}