import '@/lib/env';

import { and, eq, inArray } from 'drizzle-orm';

import { pickTranslatePayload } from '@/lib/content-translate-config';
import { joinTextOptionsMultiline, splitTextOptionsMultiline } from '@/lib/feature-definition-content';
import { buildSnapshotFromConfig, convertProductPrices } from '@/lib/currency-exchange';
import { getDefaultCurrencyForLanguage } from '@/lib/currencies';
import { translateContentFields } from '@/server/ai/translate';
import { db } from '@/server/db';
import {
  brandTranslations,
  brands,
  categoryTranslations,
  categories,
  editorialContentTranslations,
  editorialContents,
  featureDefinitionTranslations,
  featureDefinitions,
  productTranslations,
  products,
} from '@/server/db/schema';

import { loadExchangeRateConfigForScript } from './lib/load-exchange-rate-config';
import {
  ALL_BULK_TRANSLATE_TYPES,
  brandPayloadToTranslateFields,
  categoryPayloadToTranslateFields,
  createStats,
  editorialPayloadToTranslateFields,
  featurePayloadToTranslateFields,
  loadDefaultSourceLocale,
  normalizeImportSeoText,
  normalizeImportText,
  parseBulkTranslateArgs,
  pickSourceRow,
  productPayloadToTranslateFields,
  resolveUniqueBrandSlug,
  resolveUniqueCategorySlug,
  resolveUniqueEditorialSlug,
  resolveUniqueProductSlug,
  sleep,
  splitMultiline,
  touchParentUpdatedAt,
  type BulkTranslateEntityType,
  type BulkTranslateOptions,
  type TranslateRunStats,
} from './lib/translate-locale-shared';

async function translateAndPersist<T extends BulkTranslateEntityType>(options: {
  label: string;
  locales: string[];
  sourceLocale: string;
  skipExisting: boolean;
  delayMs: number;
  limit: number | null;
  loadItems: () => Promise<Array<{ parentId: string; label: string; source: unknown; existingByLocale: Map<string, { id: string }> }>>;
  shouldSkip: (existing: { id: string } | undefined, source: unknown) => boolean;
  persist: (locale: string, source: unknown, existing: { id: string } | undefined) => Promise<'created' | 'updated' | 'skipped'>;
}) {
  const stats = createStats();
  const items = await options.loadItems();
  const limited = options.limit ? items.slice(0, options.limit) : items;

  console.log(`\n[${options.label}] 共 ${limited.length} 条源内容待处理`);

  for (const item of limited) {
    for (const locale of options.locales) {
      if (locale === options.sourceLocale) continue;

      stats.processed += 1;
      const existing = item.existingByLocale.get(locale);

      try {
        if (options.skipExisting && options.shouldSkip(existing, item.source)) {
          stats.skipped += 1;
          console.log(`  跳过 ${item.label} → ${locale}（已存在）`);
          continue;
        }

        const result = await options.persist(locale, item.source, existing);
        if (result === 'created') {
          stats.created += 1;
          console.log(`  新建 ${item.label} → ${locale}`);
        } else if (result === 'updated') {
          stats.updated += 1;
          console.log(`  更新 ${item.label} → ${locale}`);
        } else {
          stats.skipped += 1;
        }

        await sleep(options.delayMs);
      } catch (error) {
        stats.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  失败 ${item.label} → ${locale}: ${message}`);
      }
    }
  }

  return stats;
}

async function translateCategories(options: BulkTranslateOptions, sourceLocale: string) {
  return translateAndPersist({
    label: '分类',
    locales: options.locales,
    sourceLocale,
    skipExisting: options.skipExisting,
    delayMs: options.delayMs,
    limit: options.limit,
    loadItems: async () => {
      const allTranslations = await db!.select().from(categoryTranslations);
      const byCategory = new Map<string, typeof allTranslations>();
      for (const row of allTranslations) {
        const bucket = byCategory.get(row.categoryId) ?? [];
        bucket.push(row);
        byCategory.set(row.categoryId, bucket);
      }

      const items = [];
      for (const [categoryId, rows] of byCategory) {
        const source = pickSourceRow(rows, sourceLocale);
        if (!source) continue;
        const existingByLocale = new Map(rows.map((row) => [row.locale, { id: row.id }]));
        items.push({ parentId: categoryId, label: source.name, source, existingByLocale });
      }
      return items;
    },
    shouldSkip: (existing) => Boolean(existing),
    persist: async (locale, sourceRow, existing) => {
      const source = sourceRow as typeof categoryTranslations.$inferSelect;
      const translated = await translateContentFields({
        contentType: 'category',
        sourceLocale,
        targetLocale: locale,
        fields: pickTranslatePayload('category', categoryPayloadToTranslateFields(source)),
      });

      const name = translated.name?.trim() || source.name;
      const slug = await resolveUniqueCategorySlug(name, locale, source.categoryId, existing?.id);
      const payload = source.payload as { tags: string[] };
      const values = {
        locale,
        name,
        slug,
        description: normalizeImportText(translated.description ?? source.description),
        seoTitle: normalizeImportSeoText(translated.seoTitle ?? source.seoTitle, 70),
        seoDescription: normalizeImportSeoText(translated.seoDescription ?? source.seoDescription, 160),
        payload: {
          tags: translated.tagsText ? splitMultiline(translated.tagsText) : payload.tags,
        },
        updatedAt: new Date(),
      };

      if (existing) {
        await db!.update(categoryTranslations).set(values).where(eq(categoryTranslations.id, existing.id));
        await touchParentUpdatedAt('categories', source.categoryId);
        return 'updated';
      }

      await db!.insert(categoryTranslations).values({ categoryId: source.categoryId, ...values });
      await touchParentUpdatedAt('categories', source.categoryId);
      return 'created';
    },
  });
}

async function translateBrands(options: BulkTranslateOptions, sourceLocale: string) {
  return translateAndPersist({
    label: '品牌',
    locales: options.locales,
    sourceLocale,
    skipExisting: options.skipExisting,
    delayMs: options.delayMs,
    limit: options.limit,
    loadItems: async () => {
      const allTranslations = await db!.select().from(brandTranslations);
      const byBrand = new Map<string, typeof allTranslations>();
      for (const row of allTranslations) {
        const bucket = byBrand.get(row.brandId) ?? [];
        bucket.push(row);
        byBrand.set(row.brandId, bucket);
      }

      const items = [];
      for (const [brandId, rows] of byBrand) {
        const source = pickSourceRow(rows, sourceLocale);
        if (!source) continue;
        const existingByLocale = new Map(rows.map((row) => [row.locale, { id: row.id }]));
        items.push({ parentId: brandId, label: source.name, source, existingByLocale });
      }
      return items;
    },
    shouldSkip: (existing) => Boolean(existing),
    persist: async (locale, sourceRow, existing) => {
      const source = sourceRow as typeof brandTranslations.$inferSelect;
      const translated = await translateContentFields({
        contentType: 'brand',
        sourceLocale,
        targetLocale: locale,
        fields: pickTranslatePayload('brand', brandPayloadToTranslateFields(source)),
      });

      const name = translated.name?.trim() || source.name;
      const slug = await resolveUniqueBrandSlug(name, locale, source.brandId, existing?.id);
      const payload = source.payload as { tags: string[] };
      const values = {
        locale,
        name,
        slug,
        description: normalizeImportText(translated.description ?? source.description),
        seoTitle: normalizeImportSeoText(translated.seoTitle ?? source.seoTitle, 70),
        seoDescription: normalizeImportSeoText(translated.seoDescription ?? source.seoDescription, 160),
        payload: {
          tags: translated.tagsText ? splitMultiline(translated.tagsText) : payload.tags,
        },
        updatedAt: new Date(),
      };

      if (existing) {
        await db!.update(brandTranslations).set(values).where(eq(brandTranslations.id, existing.id));
        await touchParentUpdatedAt('brands', source.brandId);
        return 'updated';
      }

      await db!.insert(brandTranslations).values({ brandId: source.brandId, ...values });
      await touchParentUpdatedAt('brands', source.brandId);
      return 'created';
    },
  });
}

async function translateFeatures(options: BulkTranslateOptions, sourceLocale: string) {
  return translateAndPersist({
    label: '产品特性',
    locales: options.locales,
    sourceLocale,
    skipExisting: options.skipExisting,
    delayMs: options.delayMs,
    limit: options.limit,
    loadItems: async () => {
      const allTranslations = await db!.select().from(featureDefinitionTranslations);
      const byDefinition = new Map<string, typeof allTranslations>();
      for (const row of allTranslations) {
        const bucket = byDefinition.get(row.definitionId) ?? [];
        bucket.push(row);
        byDefinition.set(row.definitionId, bucket);
      }

      const items = [];
      for (const [definitionId, rows] of byDefinition) {
        const source = pickSourceRow(rows, sourceLocale);
        if (!source) continue;
        const existingByLocale = new Map(rows.map((row) => [row.locale, { id: row.id }]));
        items.push({ parentId: definitionId, label: source.name, source, existingByLocale });
      }
      return items;
    },
    shouldSkip: (existing) => Boolean(existing),
    persist: async (locale, sourceRow, existing) => {
      const source = sourceRow as typeof featureDefinitionTranslations.$inferSelect;
      const translated = await translateContentFields({
        contentType: 'feature',
        sourceLocale,
        targetLocale: locale,
        fields: pickTranslatePayload('feature', featurePayloadToTranslateFields(source)),
      });

      const name = translated.name?.trim() || source.name;
      const values = {
        locale,
        name,
        unit: normalizeImportText(translated.unit ?? source.unit),
        textOptions: translated.textOptionsText
          ? splitTextOptionsMultiline(translated.textOptionsText)
          : source.textOptions,
        valueText: source.valueText,
        valueMin: source.valueMin,
        valueMax: source.valueMax,
        updatedAt: new Date(),
      };

      if (existing) {
        await db!.update(featureDefinitionTranslations).set(values).where(eq(featureDefinitionTranslations.id, existing.id));
        await touchParentUpdatedAt('featureDefinitions', source.definitionId);
        return 'updated';
      }

      await db!.insert(featureDefinitionTranslations).values({ definitionId: source.definitionId, ...values });
      await touchParentUpdatedAt('featureDefinitions', source.definitionId);
      return 'created';
    },
  });
}

async function translateEditorialModule(
  options: BulkTranslateOptions,
  sourceLocale: string,
  contentModule: 'editorial' | 'faq',
  contentType: 'blog' | 'faq',
  label: string,
) {
  return translateAndPersist({
    label,
    locales: options.locales,
    sourceLocale,
    skipExisting: options.skipExisting,
    delayMs: options.delayMs,
    limit: options.limit,
    loadItems: async () => {
      const contents = await db!
        .select({ id: editorialContents.id, contentModule: editorialContents.contentModule })
        .from(editorialContents)
        .where(eq(editorialContents.contentModule, contentModule));

      if (!contents.length) return [];

      const contentIds = contents.map((row) => row.id);
      const allTranslations = await db!
        .select()
        .from(editorialContentTranslations)
        .where(inArray(editorialContentTranslations.contentId, contentIds));

      const byContent = new Map<string, typeof allTranslations>();
      for (const row of allTranslations) {
        const bucket = byContent.get(row.contentId) ?? [];
        bucket.push(row);
        byContent.set(row.contentId, bucket);
      }

      const items = [];
      for (const content of contents) {
        const rows = byContent.get(content.id) ?? [];
        const source = pickSourceRow(rows, sourceLocale);
        if (!source) continue;
        const existingByLocale = new Map(rows.map((row) => [row.locale, { id: row.id }]));
        items.push({ parentId: content.id, label: source.title, source, existingByLocale });
      }
      return items;
    },
    shouldSkip: (existing) => Boolean(existing),
    persist: async (locale, sourceRow, existing) => {
      const source = sourceRow as typeof editorialContentTranslations.$inferSelect;
      const translated = await translateContentFields({
        contentType,
        sourceLocale,
        targetLocale: locale,
        fields: pickTranslatePayload(contentType, editorialPayloadToTranslateFields(source, contentType)),
      });

      const title = translated.title?.trim() || source.title;
      const slug = await resolveUniqueEditorialSlug(title, locale, contentModule, source.contentId, existing?.id);
      const payload = source.payload as {
        body: string;
        coverStyle: number | null;
        tags: string[];
        relatedProductSlugs: string[];
        authorName: string | null;
        authorTitle: string | null;
        authorBio: string | null;
        category: string | null;
      };

      const nextPayload = contentType === 'faq'
        ? {
          ...payload,
          body: translated.body?.trim() || payload.body,
        }
        : {
          ...payload,
          body: translated.body?.trim() || payload.body,
          category: normalizeImportText(translated.category ?? payload.category),
          authorName: normalizeImportText(translated.authorName ?? payload.authorName),
          authorTitle: normalizeImportText(translated.authorTitle ?? payload.authorTitle),
          authorBio: normalizeImportText(translated.authorBio ?? payload.authorBio),
          tags: translated.tagsText ? splitMultiline(translated.tagsText) : payload.tags,
          relatedProductSlugs: translated.relatedProductSlugsText
            ? splitMultiline(translated.relatedProductSlugsText)
            : payload.relatedProductSlugs,
        };

      const values = {
        locale,
        title,
        slug,
        summary: contentType === 'faq' ? source.summary : normalizeImportText(translated.summary ?? source.summary),
        seoTitle: normalizeImportSeoText(translated.seoTitle ?? source.seoTitle, 255),
        seoDescription: normalizeImportSeoText(translated.seoDescription ?? source.seoDescription, 500),
        contentType: source.contentType,
        contentModule: source.contentModule,
        payload: nextPayload,
        updatedAt: new Date(),
      };

      if (existing) {
        await db!.update(editorialContentTranslations).set(values).where(eq(editorialContentTranslations.id, existing.id));
        await touchParentUpdatedAt('editorialContents', source.contentId);
        return 'updated';
      }

      await db!.insert(editorialContentTranslations).values({ contentId: source.contentId, ...values });
      await touchParentUpdatedAt('editorialContents', source.contentId);
      return 'created';
    },
  });
}

async function translateProducts(options: BulkTranslateOptions, sourceLocale: string) {
  const exchangeSnapshot = buildSnapshotFromConfig(await loadExchangeRateConfigForScript());

  return translateAndPersist({
    label: '产品',
    locales: options.locales,
    sourceLocale,
    skipExisting: options.skipExisting,
    delayMs: options.delayMs,
    limit: options.limit,
    loadItems: async () => {
      const allTranslations = await db!
        .select({
          translation: productTranslations,
          spu: products.spu,
        })
        .from(productTranslations)
        .innerJoin(products, eq(products.id, productTranslations.productId));

      const byProduct = new Map<string, Array<{ translation: typeof productTranslations.$inferSelect; spu: string }>>();
      for (const row of allTranslations) {
        const bucket = byProduct.get(row.translation.productId) ?? [];
        bucket.push({ translation: row.translation, spu: row.spu });
        byProduct.set(row.translation.productId, bucket);
      }

      const items = [];
      for (const [productId, rows] of byProduct) {
        const sourceWrap = rows.find((row) => row.translation.locale === sourceLocale)
          ?? rows.find((row) => row.translation.locale === 'en')
          ?? rows[0];
        if (!sourceWrap) continue;
        const source = sourceWrap.translation;
        const existingByLocale = new Map(rows.map((row) => [row.translation.locale, { id: row.translation.id }]));
        items.push({
          parentId: productId,
          label: `SPU ${sourceWrap.spu}`,
          source,
          existingByLocale,
        });
      }
      return items;
    },
    shouldSkip: (existing) => Boolean(existing),
    persist: async (locale, sourceRow, existing) => {
      const source = sourceRow as typeof productTranslations.$inferSelect;
      const translated = await translateContentFields({
        contentType: 'product',
        sourceLocale,
        targetLocale: locale,
        fields: pickTranslatePayload('product', productPayloadToTranslateFields(source)),
      });

      const name = translated.name?.trim() || source.name;
      const slug = await resolveUniqueProductSlug(name, locale, source.productId);
      const targetCurrency = getDefaultCurrencyForLanguage(locale);
      const converted = convertProductPrices({
        price: Number(source.price ?? 0),
        compareAtPrice: source.compareAtPrice ? Number(source.compareAtPrice) : null,
        fromCurrency: source.currencyCode,
        toCurrency: targetCurrency,
        snapshot: exchangeSnapshot,
      });

      const payload = source.payload as {
        coverUrl: string | null;
        coverAlt: string | null;
        gallery: unknown[];
        tags: string[];
        attachments: unknown[];
        certifications: string[];
      };

      const values = {
        locale,
        name,
        slug,
        shortDescription: normalizeImportText(translated.shortDescription ?? source.shortDescription),
        description: null,
        descriptionLong: normalizeImportText(translated.descriptionLong ?? source.descriptionLong),
        seoTitle: normalizeImportSeoText(translated.seoTitle ?? source.seoTitle, 255),
        seoDescription: normalizeImportSeoText(translated.seoDescription ?? source.seoDescription, 500),
        price: converted.price != null ? String(converted.price) : source.price,
        compareAtPrice: converted.compareAtPrice != null ? String(converted.compareAtPrice) : source.compareAtPrice,
        currencyCode: converted.currencyCode,
        stockQuantity: source.stockQuantity,
        moq: source.moq,
        leadTimeMin: source.leadTimeMin,
        leadTimeMax: source.leadTimeMax,
        leadTimeUnit: source.leadTimeUnit,
        lifecycleStatus: source.lifecycleStatus,
        efficiencyClass: source.efficiencyClass,
        eolDate: source.eolDate,
        lastTimeBuyDate: source.lastTimeBuyDate,
        payload: {
          ...payload,
          coverAlt: normalizeImportText(translated.coverAlt ?? payload.coverAlt),
          tags: translated.tagsText ? splitMultiline(translated.tagsText) : payload.tags,
          certifications: translated.certificationsText
            ? splitMultiline(translated.certificationsText)
            : payload.certifications,
        },
        updatedAt: new Date(),
      };

      if (existing) {
        await db!.update(productTranslations).set(values).where(eq(productTranslations.id, existing.id));
        await touchParentUpdatedAt('products', source.productId);
        return 'updated';
      }

      await db!.insert(productTranslations).values({ productId: source.productId, ...values });
      await touchParentUpdatedAt('products', source.productId);
      return 'created';
    },
  });
}

function mergeStats(target: TranslateRunStats, source: TranslateRunStats) {
  target.processed += source.processed;
  target.created += source.created;
  target.updated += source.updated;
  target.skipped += source.skipped;
  target.failed += source.failed;
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is required');

  const options = parseBulkTranslateArgs(process.argv.slice(2));
  const sourceLocale = options.sourceLocale || await loadDefaultSourceLocale();
  const targetLocales = options.locales.filter((locale) => locale !== sourceLocale);

  if (!targetLocales.length) {
    throw new Error('目标语言不能与源语言完全相同');
  }

  const invalidTypes = options.types.filter((type) => !ALL_BULK_TRANSLATE_TYPES.includes(type));
  if (invalidTypes.length) {
    throw new Error(`未知类型: ${invalidTypes.join(', ')}`);
  }

  console.log('批量翻译开始');
  console.log(`源语言: ${sourceLocale}`);
  console.log(`目标语言: ${targetLocales.join(', ')}`);
  console.log(`类型: ${options.types.join(', ')}`);
  console.log(`模式: ${options.skipExisting ? '仅补缺' : '覆盖写入'}`);
  if (options.limit) console.log(`限制: 每类最多 ${options.limit} 条`);

  const totals = createStats();

  for (const type of options.types) {
    let stats: TranslateRunStats;
    switch (type) {
      case 'category':
        stats = await translateCategories({ ...options, locales: targetLocales }, sourceLocale);
        break;
      case 'brand':
        stats = await translateBrands({ ...options, locales: targetLocales }, sourceLocale);
        break;
      case 'feature':
        stats = await translateFeatures({ ...options, locales: targetLocales }, sourceLocale);
        break;
      case 'blog':
        stats = await translateEditorialModule({ ...options, locales: targetLocales }, sourceLocale, 'editorial', 'blog', '博客');
        break;
      case 'faq':
        stats = await translateEditorialModule({ ...options, locales: targetLocales }, sourceLocale, 'faq', 'faq', 'FAQ');
        break;
      case 'product':
        stats = await translateProducts({ ...options, locales: targetLocales }, sourceLocale);
        break;
      default:
        continue;
    }

    mergeStats(totals, stats);
    console.log(
      `[${type}] 处理 ${stats.processed} | 新建 ${stats.created} | 更新 ${stats.updated} | 跳过 ${stats.skipped} | 失败 ${stats.failed}`,
    );
  }

  console.log('\n全部完成');
  console.log(
    `总计: 处理 ${totals.processed} | 新建 ${totals.created} | 更新 ${totals.updated} | 跳过 ${totals.skipped} | 失败 ${totals.failed}`,
  );

  if (totals.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
