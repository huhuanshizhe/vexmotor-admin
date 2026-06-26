import { asc, eq } from 'drizzle-orm';

import { normalizeLocale, type Locale } from '@/lib/i18n';
import { brandNameSql, brandSlugSql } from '@/server/brands/resolve-brand-translation';
import { db } from '@/server/db';
import { brands } from '@/server/db/schema';

export type StorefrontBrandListItem = {
  id: string;
  name: string;
  slug: string;
  logo: { url: string; alt: string } | null;
  websiteUrl: string | null;
};

function brandsLocale(locale?: string | null): Locale {
  return normalizeLocale(locale);
}

export async function getStorefrontBrands(localeInput?: string | null) {
  const locale = brandsLocale(localeInput);
  const rows = await db
    .select({
      id: brands.id,
      name: brandNameSql(brands.id, locale),
      slug: brandSlugSql(brands.id, locale),
      logoUrl: brands.logoUrl,
      websiteUrl: brands.websiteUrl,
    })
    .from(brands)
    .where(eq(brands.status, 'active'))
    .orderBy(asc(brandNameSql(brands.id, locale)));

  return {
    locale,
    brands: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: row.logoUrl ? { url: row.logoUrl, alt: row.name } : null,
      websiteUrl: row.websiteUrl,
    })) satisfies StorefrontBrandListItem[],
  };
}
