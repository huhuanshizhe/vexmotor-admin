import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { eq, inArray, notInArray } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  attachments,
  brands,
  categories,
  cmsPages,
  contentBlocks,
  editorialContentEntries,
  productCategories,
  productFeatures,
  productImages,
  products,
} from '@/server/db/schema';

type ProductSnapshot = {
  url: string;
  title?: string | null;
  heading?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  descriptionLong?: string | null;
  ldProduct?: {
    name?: string | null;
    sku?: string | null;
    description?: string | null;
    brand?: string | null;
    price?: string | number | null;
    currency?: string | null;
    images?: string[];
  } | null;
  galleryImages?: string[];
  downloads?: Array<{ url: string; label?: string; mimeType?: string }>;
  technicalSpecs?: Array<{ key: string; value: string; unit?: string | null }>;
};

type CategorySnapshot = {
  url: string;
  title?: string | null;
  heading?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type PageSnapshot = {
  url: string;
  title?: string | null;
  heading?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  bodyTextExcerpt?: string | null;
};

type FooterSnapshot = {
  html?: string;
  text?: string;
  links?: Array<{ href: string; label: string }>;
};

type BannerSnapshot = {
  images?: string[];
};

function categorizeSpec(key: string) {
  const lower = key.toLowerCase();

  if (/product type|motor type|model type|type/i.test(lower)) {
    return 'product_type';
  }

  if (/current|voltage|resistance|inductance|power|phase|wire|bipolar|unipolar|rating|electrical/i.test(lower)) {
    return 'electrical';
  }

  if (/torque|step angle|shaft|body|frame|length|width|height|diameter|weight|mounting|flange|size|dimension|gear|ratio/i.test(lower)) {
    return 'physical';
  }

  if (/temperature|humidity|protection|insulation|class|ip rating|environment/i.test(lower)) {
    return 'environmental';
  }

  return 'general';
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

function categorySlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const withoutLeadId = segment.replace(/^\d+-/, '');
  const withoutTailId = withoutLeadId.replace(/-\d+$/, '');
  return normalizeSlug(withoutTailId);
}

function productSlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  const withoutHtml = segment.replace(/\.html$/i, '');
  const withoutLeadId = withoutHtml.replace(/^\d+-/, '');
  const withoutTailNumeric = withoutLeadId.replace(/-\d{10,}$/, '');
  return normalizeSlug(withoutTailNumeric);
}

function pageSlugFromPath(pathname: string) {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) {
    return 'home';
  }

  const segments = clean.split('/').filter(Boolean);
  const localePrefix = ['en', 'es', 'de', 'fr'].includes(segments[0] ?? '') ? segments[0] : null;
  const leaf = segments.at(-1) ?? clean;
  const normalizedLeaf = /^\d+-/.test(leaf) ? normalizeSlug(leaf.replace(/^\d+-/, '')) : normalizeSlug(leaf);

  if (localePrefix) {
    return `${localePrefix}-${normalizedLeaf}`;
  }

  if (/^\d+-/.test(leaf)) {
    return normalizeSlug(leaf.replace(/^\d+-/, ''));
  }

  return normalizedLeaf;
}

function toTitleCaseFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function isGenericLegacyHeading(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /didn[’']?t find what you[\s\S]*looking for/i.test(value);
}

function inferCategorySlugFromProduct(item: ProductSnapshot) {
  const candidates = [item.ldProduct?.name, item.heading, item.title, item.seoTitle]
    .filter((value): value is string => Boolean(value))
    .map((value) => decodeBasicEntities(value).toLowerCase());

  for (const candidate of candidates) {
    const nemaMatch = candidate.match(/\bnema[\s-]*(8|11|14|16|17|23|24|34)\b/);
    if (nemaMatch) {
      return `nema-${nemaMatch[1]}-stepper-motor`;
    }

    const leadingFrameMatch = candidate.match(/^(8|11|14|16|17|23|24|34)\b.*stepper motor/);
    if (leadingFrameMatch) {
      return `nema-${leadingFrameMatch[1]}-stepper-motor`;
    }

    if (candidate.includes('integrated stepper')) {
      return 'integrated-stepper-motor';
    }
    if (candidate.includes('closed loop')) {
      return 'closed-loop-stepper-motor';
    }
    if (candidate.includes('brushless spindle')) {
      return 'brushless-spindle-motor';
    }
    if (candidate.includes('brushless dc')) {
      return 'brushless-dc-motor';
    }
    if (candidate.includes('power supply')) {
      return 'power-supply';
    }
    if (candidate.includes('driver')) {
      return 'stepper-motor-driver';
    }
    if (candidate.includes('stepper motor')) {
      return 'stepper-motor';
    }
  }

  return null;
}

function sanitizeSku(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

async function resolveUniqueSku(baseSku: string, slug: string) {
  const safeBase = sanitizeSku(baseSku || slug || 'LEGACY-SKU');
  const fallbackSuffix = slug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-8) || 'LEGACY';

  const [existingBySlug] = await db!.select({ sku: products.sku }).from(products).where(eq(products.slug, slug)).limit(1);
  if (existingBySlug?.sku) {
    return existingBySlug.sku;
  }

  let candidate = safeBase;
  let attempt = 0;
  // Guarantee uniqueness against products_sku_unique while preserving readable SKU roots.
  while (attempt < 30) {
    const [existingBySku] = await db!.select({ id: products.id }).from(products).where(eq(products.sku, candidate)).limit(1);
    if (!existingBySku) {
      return candidate;
    }

    attempt += 1;
    candidate = `${safeBase}-${fallbackSuffix}${attempt > 1 ? `-${attempt}` : ''}`;
  }

  return `${safeBase}-${Date.now()}`;
}

async function loadJson<T>(baseDir: string, fileName: string): Promise<T> {
  const fullPath = path.join(baseDir, fileName);
  const raw = await readFile(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

async function upsertCategory(entry: CategorySnapshot) {
  const url = new URL(entry.url);
  const slug = categorySlugFromPath(url.pathname);
  if (!slug) {
    return null;
  }

  const preferredName = isGenericLegacyHeading(entry.heading) ? (entry.title || entry.heading || '') : (entry.heading || entry.title || '');
  const name = decodeBasicEntities((preferredName || toTitleCaseFromSlug(slug)).trim());
  const seoTitle = entry.seoTitle || entry.title || name;
  const seoDescription = entry.seoDescription || null;

  await db!
    .insert(categories)
    .values({
      name,
      slug,
      description: seoDescription,
      seoTitle,
      seoDescription,
      status: 'active',
    })
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name,
        description: seoDescription,
        seoTitle,
        seoDescription,
        status: 'active',
        updatedAt: new Date(),
      },
    });

  const [saved] = await db!.select({ id: categories.id, slug: categories.slug }).from(categories).where(eq(categories.slug, slug)).limit(1);
  return saved ?? null;
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running import script');
  }

  const inputDir = path.resolve(process.cwd(), process.argv[2] || 'migration/vexmotor');

  const [productsSnapshot, categoriesSnapshot, pagesSnapshot, articlesSnapshot, footerSnapshot, bannerSnapshot] = await Promise.all([
    loadJson<ProductSnapshot[]>(inputDir, 'products.json'),
    loadJson<CategorySnapshot[]>(inputDir, 'categories.json'),
    loadJson<PageSnapshot[]>(inputDir, 'pages.json'),
    loadJson<PageSnapshot[]>(inputDir, 'articles.json'),
    loadJson<FooterSnapshot>(inputDir, 'footer.json'),
    loadJson<BannerSnapshot>(inputDir, 'banner.json'),
  ]);

  const legacyBrandSlug = 'stepmotech';
  const legacyBrandName = 'StepMotech';

  const importedProductSlugs = Array.from(
    new Set(
      productsSnapshot
        .map((item) => {
          const url = new URL(item.url);
          return productSlugFromPath(url.pathname);
        })
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );

  if (importedProductSlugs.length > 0) {
    const staleProducts = await db!
      .select({ id: products.id })
      .from(products)
      .where(notInArray(products.slug, importedProductSlugs));

    const staleProductIds = staleProducts.map((item) => item.id);
    if (staleProductIds.length > 0) {
      await db!.delete(attachments).where(inArray(attachments.productId, staleProductIds));
      await db!.delete(productImages).where(inArray(productImages.productId, staleProductIds));
      await db!.delete(productFeatures).where(inArray(productFeatures.productId, staleProductIds));
      await db!.delete(productCategories).where(inArray(productCategories.productId, staleProductIds));
      await db!
        .update(products)
        .set({
          status: 'archived',
          defaultCategoryId: null,
          featured: false,
          updatedAt: new Date(),
        })
        .where(inArray(products.id, staleProductIds));
    }
  }

  await db!
    .insert(brands)
    .values({
      name: legacyBrandName,
      slug: legacyBrandSlug,
      description: 'Imported from legacy site during migration.',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: brands.slug,
      set: {
        name: legacyBrandName,
        status: 'active',
        updatedAt: new Date(),
      },
    });

  const [brand] = await db!.select({ id: brands.id }).from(brands).where(eq(brands.slug, legacyBrandSlug)).limit(1);
  if (!brand) {
    throw new Error('Failed to resolve StepMotech brand record');
  }

  const categoryBySlug = new Map<string, string>();
  const importedCategorySlugs = Array.from(
    new Set(
      categoriesSnapshot
        .map((item) => {
          const url = new URL(item.url);
          return categorySlugFromPath(url.pathname);
        })
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );

  if (importedCategorySlugs.length > 0) {
    await db!
      .update(categories)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(notInArray(categories.slug, importedCategorySlugs));
  }

  for (const item of categoriesSnapshot) {
    const row = await upsertCategory(item);
    if (row) {
      categoryBySlug.set(row.slug, row.id);
    }
  }

  let importedProducts = 0;
  for (const item of productsSnapshot) {
    if (!item.ldProduct?.name) {
      continue;
    }

    const url = new URL(item.url);
    const slug = productSlugFromPath(url.pathname);
    const rawCategorySlug = categorySlugFromPath(url.pathname);
    const inferredCategorySlug = inferCategorySlugFromProduct(item);
    const categorySlug = categoryBySlug.has(rawCategorySlug) ? rawCategorySlug : inferredCategorySlug;
    const categoryId = categorySlug ? (categoryBySlug.get(categorySlug) ?? null) : null;

    if (!slug) {
      continue;
    }

    const name = item.ldProduct.name.trim();
    const sku = await resolveUniqueSku(item.ldProduct.sku || slug, slug);
    const description = (item.ldProduct.description || item.seoDescription || '').trim();
    const descriptionLong = item.descriptionLong?.trim() || null;
    const shortDescription = (item.heading || item.seoDescription || '').trim();
    const price = Number(item.ldProduct.price ?? 0);
    const safePrice = Number.isFinite(price) ? price.toFixed(2) : '0.00';

    await db!
      .insert(products)
      .values({
        brandId: brand.id,
        defaultCategoryId: categoryId,
        name,
        slug,
        sku,
        shortDescription: shortDescription || null,
        description: description || null,
        descriptionLong,
        purchaseMode: 'buy',
        status: 'active',
        price: safePrice,
        currencyCode: item.ldProduct.currency || 'USD',
        stockQuantity: 100,
        featured: false,
        seoTitle: item.seoTitle || item.title || name,
        seoDescription: item.seoDescription || null,
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          brandId: brand.id,
          defaultCategoryId: categoryId,
          name,
          sku,
          shortDescription: shortDescription || null,
          description: description || null,
          descriptionLong,
          status: 'active',
          price: safePrice,
          currencyCode: item.ldProduct.currency || 'USD',
          seoTitle: item.seoTitle || item.title || name,
          seoDescription: item.seoDescription || null,
          updatedAt: new Date(),
        },
      });

    const [saved] = await db!
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (!saved) {
      continue;
    }

    await db!.delete(productCategories).where(eq(productCategories.productId, saved.id));

    if (categoryId) {
      await db!
        .insert(productCategories)
        .values({ productId: saved.id, categoryId })
        .onConflictDoNothing();
    }

    // 迁移所有图片（主图 + 图库 + 尺寸图）
    const allImages = [...new Set([...(item.galleryImages || []), ...(item.ldProduct.images || [])].filter(Boolean))].slice(0, 12);
    await db!.delete(productImages).where(eq(productImages.productId, saved.id));
    
    if (allImages.length) {
      const imageRows = allImages.map((imageUrl, index) => {
        const marker = imageUrl.toLowerCase();
        const isDimension = /dimension|diagram|size|drawing|outline|mechanical/i.test(marker);
        const isDetailImage = /torque|curve|performance|graph|detail/i.test(marker) && !isDimension;
        return {
          productId: saved.id,
          url: imageUrl,
          alt: item.heading || name,
          sortOrder: index + 1,
          isPrimary: index === 0,
          isDimension: isDimension,
          imageType: isDimension ? 'dimension' : isDetailImage ? 'detail' : 'gallery',
        };
      });
      await db!.insert(productImages).values(imageRows);
    }

    // 迁移技术规格参数
    await db!.delete(productFeatures).where(eq(productFeatures.productId, saved.id));
    const specRows = (item.technicalSpecs || [])
      .filter((spec) => spec.key && spec.value)
      .slice(0, 32)
      .map((spec, index) => ({
        productId: saved.id,
        featureKey: spec.key.trim(),
        featureValue: String(spec.value).trim(),
        unit: spec.unit || null,
        specCategory: categorizeSpec(spec.key),
        sortOrder: index + 1,
      }));
    if (specRows.length) {
      await db!.insert(productFeatures).values(specRows);
    }

    // 迁移下载文件（PDF 等技术文档）
    await db!.delete(attachments).where(eq(attachments.productId, saved.id));
    const attachmentRows = (item.downloads || [])
      .filter((asset) => asset.url && !asset.url.includes('#')) // 过滤掉页面锚点链接
      .slice(0, 10)
      .map((asset, index) => ({
        productId: saved.id,
        name: (asset.label || `Technical Document ${index + 1}`).slice(0, 255),
        url: asset.url,
        mimeType: asset.mimeType || 'application/pdf',
        sortOrder: index + 1,
      }));
    if (attachmentRows.length) {
      await db!.insert(attachments).values(attachmentRows);
    }

    importedProducts += 1;
  }

  for (const item of pagesSnapshot) {
    const url = new URL(item.url);
    const slug = pageSlugFromPath(url.pathname);
    const title = (item.heading || item.title || toTitleCaseFromSlug(slug)).trim();

    await db!
      .insert(cmsPages)
      .values({
        title,
        slug,
        summary: item.seoDescription || null,
        content: item.bodyTextExcerpt || null,
        seoTitle: item.seoTitle || item.title || title,
        seoDescription: item.seoDescription || null,
        status: 'published',
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cmsPages.slug,
        set: {
          title,
          summary: item.seoDescription || null,
          content: item.bodyTextExcerpt || null,
          seoTitle: item.seoTitle || item.title || title,
          seoDescription: item.seoDescription || null,
          status: 'published',
          updatedAt: new Date(),
        },
      });
  }

  for (const item of articlesSnapshot) {
    const url = new URL(item.url);
    const slug = pageSlugFromPath(url.pathname);
    const title = (item.heading || item.title || toTitleCaseFromSlug(slug)).trim();

    await db!
      .insert(editorialContentEntries)
      .values({
        contentType: 'blog',
        title,
        slug,
        summary: item.seoDescription || null,
        locale: 'en-US',
        status: 'published',
        seoTitle: item.seoTitle || item.title || title,
        seoDescription: item.seoDescription || null,
        publishedAt: new Date(),
        payload: {
          lead: item.bodyTextExcerpt || item.seoDescription || '',
          topic: 'Stepper',
          industry: 'Factory Automation',
          authorId: 'site-editorial-team',
          readMinutes: 6,
          viewCount: 0,
          coverAlt: title,
          relatedProductSlugs: [],
          relatedPostSlugs: [],
          sections: [
            {
              id: 'legacy-import',
              title,
              blocks: [
                {
                  type: 'paragraph',
                  text: item.bodyTextExcerpt || item.seoDescription || '',
                },
              ],
            },
          ],
        },
      })
      .onConflictDoUpdate({
        target: [editorialContentEntries.contentType, editorialContentEntries.slug, editorialContentEntries.locale],
        set: {
          title,
          summary: item.seoDescription || null,
          seoTitle: item.seoTitle || item.title || title,
          seoDescription: item.seoDescription || null,
          status: 'published',
          payload: {
            lead: item.bodyTextExcerpt || item.seoDescription || '',
            topic: 'Stepper',
            industry: 'Factory Automation',
            authorId: 'site-editorial-team',
            readMinutes: 6,
            viewCount: 0,
            coverAlt: title,
            relatedProductSlugs: [],
            relatedPostSlugs: [],
            sections: [
              {
                id: 'legacy-import',
                title,
                blocks: [
                  {
                    type: 'paragraph',
                    text: item.bodyTextExcerpt || item.seoDescription || '',
                  },
                ],
              },
            ],
          },
          updatedAt: new Date(),
        },
      });
  }

  await db!
    .insert(contentBlocks)
    .values([
      {
        placement: 'home.legacy-import',
        blockKey: 'banner-images',
        title: 'Legacy homepage banners',
        subtitle: 'Imported from vexmotor.com',
        content: {
          images: bannerSnapshot.images || [],
        },
        status: 'active',
        sortOrder: 1,
      },
      {
        placement: 'footer.legacy-import',
        blockKey: 'footer-content',
        title: 'Legacy footer content',
        subtitle: 'Imported from vexmotor.com',
        content: {
          text: footerSnapshot.text || '',
          html: footerSnapshot.html || '',
          links: footerSnapshot.links || [],
        },
        status: 'active',
        sortOrder: 1,
      },
    ])
    .onConflictDoUpdate({
      target: [contentBlocks.placement, contentBlocks.blockKey],
      set: {
        title: 'Legacy imported content',
        subtitle: 'Imported from vexmotor.com',
        content: {
          bannerImages: bannerSnapshot.images || [],
          footerText: footerSnapshot.text || '',
          footerHtml: footerSnapshot.html || '',
          footerLinks: footerSnapshot.links || [],
        },
        status: 'active',
        updatedAt: new Date(),
      },
    });

  console.log(
    JSON.stringify(
      {
        inputDir,
        importedProducts,
        importedCategories: categoryBySlug.size,
        importedPages: pagesSnapshot.length,
        importedArticles: articlesSnapshot.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('VexMotor import failed:', error);
  process.exitCode = 1;
});
