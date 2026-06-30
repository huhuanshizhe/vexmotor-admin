import '@/lib/env';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import { pickTranslatePayload } from '@/lib/content-translate-config';
import { buildSnapshotFromConfig, convertProductPrices } from '@/lib/currency-exchange';
import { getDefaultCurrencyForLanguage } from '@/lib/currencies';
import { resolveSlugForSave } from '@/lib/slug';
import { translateContentFields } from '@/server/ai/translate';
import { db } from '@/server/db';
import { productTranslations, products } from '@/server/db/schema';
import {
  findProductIdBySpu,
  IMPORT_DEFAULT_LOCALE,
  normalizeImportSeoText,
  normalizeImportText,
} from './lib/import-product-shared';
import { loadExchangeRateConfigForScript } from './lib/load-exchange-rate-config';
import { sleep } from './lib/translate-locale-shared';

type FailureItem = {
  spu: string;
  locale: string;
  previousError: string;
};

function parseFailuresFile(text: string): FailureItem[] {
  const items: FailureItem[] = [];
  const blocks = text.split(/\n(?=\d+\.\s+SPU\s+)/);
  for (const block of blocks) {
    const header = block.match(/^\d+\.\s+SPU\s+(.+?)\s+→\s+(\w+)/);
    if (!header) continue;
    const errorLine = block.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !/^\d+\./.test(l));
    items.push({
      spu: header[1].trim(),
      locale: header[2].trim(),
      previousError: errorLine ?? '',
    });
  }
  return items;
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

async function retryOne(
  item: FailureItem,
  exchangeSnapshot: ReturnType<typeof buildSnapshotFromConfig>,
) {
  const productId = await findProductIdBySpu(item.spu);
  if (!productId) throw new Error(`未找到 SPU=${item.spu}`);

  const [sourceTranslation] = await db!
    .select()
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, IMPORT_DEFAULT_LOCALE)))
    .limit(1);

  if (!sourceTranslation) {
    throw new Error(`产品 ${item.spu} 缺少默认语言 ${IMPORT_DEFAULT_LOCALE} 翻译`);
  }

  const payload = sourceTranslation.payload as {
    coverAlt?: string | null;
    tags?: string[];
    certifications?: string[];
  };

  const sourceFields = {
    name: sourceTranslation.name,
    shortDescription: sourceTranslation.shortDescription ?? '',
    description: sourceTranslation.description ?? '',
    coverAlt: payload.coverAlt ?? '',
    certificationsText: (payload.certifications ?? []).join('\n'),
    tagsText: (payload.tags ?? []).join('\n'),
    seoTitle: sourceTranslation.seoTitle ?? '',
    seoDescription: sourceTranslation.seoDescription ?? '',
  };

  const translated = await translateContentFields({
    contentType: 'product',
    sourceLocale: IMPORT_DEFAULT_LOCALE,
    targetLocale: item.locale,
    fields: pickTranslatePayload('product', sourceFields),
  });

  const name = translated.name?.trim() || sourceTranslation.name;
  const slug = await resolveUniqueSlug(name, item.locale, productId);
  const converted = convertProductPrices({
    price: Number(sourceTranslation.price ?? 0),
    compareAtPrice: sourceTranslation.compareAtPrice ? Number(sourceTranslation.compareAtPrice) : null,
    fromCurrency: sourceTranslation.currencyCode,
    toCurrency: getDefaultCurrencyForLanguage(item.locale),
    snapshot: exchangeSnapshot,
  });

  const values = {
    locale: item.locale,
    name,
    slug,
    shortDescription: normalizeImportText(translated.shortDescription ?? sourceTranslation.shortDescription),
    description: normalizeImportText(translated.description ?? sourceTranslation.description),
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

  const [existing] = await db!
    .select({ id: productTranslations.id })
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, item.locale)))
    .limit(1);

  if (existing) {
    await db!.update(productTranslations).set(values).where(eq(productTranslations.id, existing.id));
  } else {
    await db!.insert(productTranslations).values({ productId, ...values });
  }

  await db!.update(products).set({ updatedAt: new Date() }).where(eq(products.id, productId));
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is required');

  const inputPath = process.argv[2]
    ?? path.resolve(process.cwd(), 'migration/translate-runs/product-translate-failures.txt');
  const outDir = path.resolve(process.cwd(), 'migration/translate-runs');
  const outPath = path.join(outDir, 'product-translate-failures-still-failed.txt');
  const delayMs = Number(process.argv[3] ?? '800') || 800;

  const text = await readFile(inputPath, 'utf8');
  const items = parseFailuresFile(text);
  if (!items.length) throw new Error(`未从 ${inputPath} 解析到失败项`);

  console.log(`读取 ${items.length} 条失败记录，开始逐条重试...\n`);

  const exchangeSnapshot = buildSnapshotFromConfig(await loadExchangeRateConfigForScript());
  const stillFailed: Array<FailureItem & { error: string }> = [];
  let success = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const label = `[${i + 1}/${items.length}] SPU ${item.spu} → ${item.locale}`;
    try {
      await retryOne(item, exchangeSnapshot);
      success += 1;
      console.log(`  成功 ${label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stillFailed.push({ ...item, error: message });
      console.error(`  仍失败 ${label}: ${message}`);
    }
    await sleep(delayMs);
  }

  await mkdir(outDir, { recursive: true });

  const header = [
    '# Product translate retry — still failed',
    `# Generated: ${new Date().toISOString()}`,
    `# Source: ${inputPath}`,
    `# Retried: ${items.length} | Success: ${success} | Still failed: ${stillFailed.length}`,
    '',
  ].join('\n');

  const body = stillFailed.length
    ? stillFailed.map((f, i) => `${i + 1}. SPU ${f.spu} → ${f.locale}\n   Previous: ${f.previousError}\n   Retry: ${f.error}`).join('\n\n')
    : '(none — all retries succeeded)\n';

  await writeFile(outPath, `${header}${body}\n`, 'utf8');

  console.log('\n========== 重试完成 ==========');
  console.log(`成功: ${success}/${items.length}`);
  console.log(`仍失败: ${stillFailed.length}`);
  console.log(`仍失败记录: ${outPath}`);

  if (stillFailed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
