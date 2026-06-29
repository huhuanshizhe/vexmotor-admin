import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { pickTranslatePayload } from '@/lib/content-translate-config';
import { buildSnapshotFromConfig, convertProductPrices } from '@/lib/currency-exchange';
import { getDefaultCurrencyForLanguage } from '@/lib/currencies';
import { resolveSlugForSave } from '@/lib/slug';
import { translateContentFields } from '@/server/ai/translate';
import { db } from '@/server/db';
import { productTranslations, products } from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';
import {
  findProductIdBySpu,
  IMPORT_DEFAULT_LOCALE,
  normalizeImportSeoText,
  normalizeImportText,
} from './lib/import-product-shared';
import { loadExchangeRateConfigForScript } from './lib/load-exchange-rate-config';

function parseArgs(argv: string[]) {
  const getArg = (name: string) => {
    const index = argv.indexOf(name);
    if (index >= 0 && argv[index + 1]) return argv[index + 1];
    return null;
  };

  const spu = getArg('--spu');
  const locales = (getArg('--locales') ?? 'de,es')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!spu) {
    throw new Error('Usage: tsx scripts/translate-product-locales.ts --spu <spu> [--locales de,es]');
  }

  return { spu, locales };
}

async function resolveUniqueSlug(name: string, locale: string, productId: string) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [conflict] = await db!
      .select({ id: productTranslations.id })
      .from(productTranslations)
      .where(and(eq(productTranslations.slug, candidate), eq(productTranslations.locale, locale)))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${productId.slice(0, 8)}`;
  }
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is required');

  const { spu, locales } = parseArgs(process.argv.slice(2));
  const productId = await findProductIdBySpu(spu);
  if (!productId) throw new Error(`未找到 SPU=${spu} 的产品`);

  const [sourceTranslation] = await db
    .select()
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, IMPORT_DEFAULT_LOCALE)))
    .limit(1);

  if (!sourceTranslation) {
    throw new Error(`产品 ${spu} 缺少默认语言 ${IMPORT_DEFAULT_LOCALE} 翻译`);
  }

  const exchangeConfig = await loadExchangeRateConfigForScript();
  const exchangeSnapshot = buildSnapshotFromConfig(exchangeConfig);

  const sourceFields = {
    name: sourceTranslation.name,
    shortDescription: sourceTranslation.shortDescription ?? '',
    descriptionLong: sourceTranslation.descriptionLong ?? '',
    coverAlt: (sourceTranslation.payload as { coverAlt?: string | null })?.coverAlt ?? '',
    certificationsText: '',
    tagsText: '',
    seoTitle: sourceTranslation.seoTitle ?? '',
    seoDescription: sourceTranslation.seoDescription ?? '',
  };

  for (const locale of locales) {
    if (locale === IMPORT_DEFAULT_LOCALE) continue;

    const translated = await translateContentFields({
      contentType: 'product',
      sourceLocale: IMPORT_DEFAULT_LOCALE,
      targetLocale: locale,
      fields: pickTranslatePayload('product', sourceFields),
    });

    const name = translated.name?.trim() || sourceTranslation.name;
    const slug = await resolveUniqueSlug(name, locale, productId);
    const targetCurrency = getDefaultCurrencyForLanguage(locale);
    const converted = convertProductPrices({
      price: Number(sourceTranslation.price ?? 0),
      compareAtPrice: sourceTranslation.compareAtPrice ? Number(sourceTranslation.compareAtPrice) : null,
      fromCurrency: sourceTranslation.currencyCode,
      toCurrency: targetCurrency,
      snapshot: exchangeSnapshot,
    });

    const values = {
      locale,
      name,
      slug,
      shortDescription: normalizeImportText(translated.shortDescription ?? sourceTranslation.shortDescription),
      description: null,
      descriptionLong: normalizeImportText(translated.descriptionLong ?? sourceTranslation.descriptionLong),
      seoTitle: normalizeImportSeoText(translated.seoTitle ?? sourceTranslation.seoTitle, 255),
      seoDescription: normalizeImportSeoText(translated.seoDescription ?? sourceTranslation.seoDescription, 500),
      price: converted.price != null ? String(converted.price) : sourceTranslation.price,
      compareAtPrice: converted.compareAtPrice != null ? String(converted.compareAtPrice) : sourceTranslation.compareAtPrice,
      currencyCode: converted.currencyCode,
      stockQuantity: sourceTranslation.stockQuantity,
      moq: sourceTranslation.moq,
      leadTimeMin: sourceTranslation.leadTimeMin,
      leadTimeMax: sourceTranslation.leadTimeMax,
      leadTimeUnit: sourceTranslation.leadTimeUnit,
      lifecycleStatus: sourceTranslation.lifecycleStatus,
      efficiencyClass: sourceTranslation.efficiencyClass,
      eolDate: sourceTranslation.eolDate,
      lastTimeBuyDate: sourceTranslation.lastTimeBuyDate,
      payload: sourceTranslation.payload,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: productTranslations.id })
      .from(productTranslations)
      .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, locale)))
      .limit(1);

    if (existing) {
      await db.update(productTranslations).set(values).where(eq(productTranslations.id, existing.id));
      console.log(`更新 ${locale}: ${name} | ${converted.price ?? '-'} ${converted.currencyCode}`);
    } else {
      await db.insert(productTranslations).values({ productId, ...values });
      console.log(`新建 ${locale}: ${name} | ${converted.price ?? '-'} ${converted.currencyCode}`);
    }
  }

  await db.update(products).set({ updatedAt: new Date() }).where(eq(products.id, productId));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
