import '@/lib/env';

import path from 'node:path';

import { eq } from 'drizzle-orm';

import { type AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import { productTranslations, products } from '@/server/db/schema';
import { DEFAULT_PRODUCT_LOCALE } from '@/server/products/resolve-product-translation';

const DEFAULT_LOCALE = DEFAULT_PRODUCT_LOCALE;
const forceRefresh = process.argv.includes('--force');

function extensionFromUrl(url: string) {
  const clean = url.split('?')[0] ?? url;
  const ext = path.extname(clean).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.gif') {
    return ext;
  }
  return '.jpg';
}

function mimeFromExtension(ext: string) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/png';
  }
}

function safeKeySegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
}

function getOssDomain() {
  return (
    process.env.ALIYUN_OSS_DOMAIN?.replace(/\/$/, '')
    ?? process.env.NEXT_PUBLIC_ALIYUN_OSS_DOMAIN?.replace(/\/$/, '')
    ?? ''
  );
}

function isAlreadyOnOss(url: string | null | undefined) {
  if (!url?.trim()) return false;
  const domain = getOssDomain();
  if (!domain) return false;
  return url.startsWith(`${domain}/`);
}

async function getOssClient() {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.ALIYUN_OSS_BUCKET;
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT;
  const region = process.env.ALIYUN_OSS_REGION;
  const domain = getOssDomain();

  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint || !domain) {
    throw new Error('Aliyun OSS 未配置，无法上传产品图片');
  }

  const OSS = (await import('ali-oss')).default;
  const client = new OSS({
    region: region ?? endpoint.replace(/^https?:\/\//, ''),
    accessKeyId,
    accessKeySecret,
    bucket,
    secure: endpoint.startsWith('https'),
    endpoint,
  });

  return { client, domain };
}

async function uploadToOssKey(key: string, buffer: Buffer, contentType: string) {
  const { client, domain } = await getOssClient();
  await client.put(key, buffer, {
    mime: contentType,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
  return `${domain}/${key}`;
}

async function downloadImage(url: string, retries = 3) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; stepmotech-import/1.0)',
          accept: 'image/*,*/*;q=0.8',
          referer: 'https://www.vexmotor.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 500) {
        throw new Error(`图片过小 (${buffer.length} bytes)`);
      }

      const contentType = response.headers.get('content-type') ?? mimeFromExtension(extensionFromUrl(url));
      return { buffer, contentType };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw new Error(`下载失败: ${url} (${lastError?.message ?? 'unknown'})`);
}

function isProtectedTechnicalImage(url: string) {
  return /\/stepmotech\/(?:torque_curves|dimensions)\//i.test(url);
}

async function migrateImageUrl(
  sourceUrl: string,
  ossKey: string,
  cache: Map<string, string>,
): Promise<{ url: string; uploaded: boolean; skipped: boolean; failed: boolean }> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return { url: trimmed, uploaded: false, skipped: true, failed: false };
  }

  if (!forceRefresh && isAlreadyOnOss(trimmed)) {
    return { url: trimmed, uploaded: false, skipped: true, failed: false };
  }

  const cached = cache.get(trimmed);
  if (cached) {
    return { url: cached, uploaded: false, skipped: false, failed: false };
  }

  try {
    const { buffer, contentType } = await downloadImage(trimmed);
    const ext = extensionFromUrl(trimmed);
    const key = ossKey.endsWith(ext) ? ossKey : `${ossKey}${ext}`;
    const ossUrl = await uploadToOssKey(key, buffer, contentType);
    cache.set(trimmed, ossUrl);
    return { url: ossUrl, uploaded: true, skipped: false, failed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isProtectedTechnicalImage(trimmed)) {
      console.warn(`  跳过技术图（源站不可下载）: ${trimmed} | ${message}`);
      return { url: trimmed, uploaded: false, skipped: false, failed: true };
    }
    console.warn(`  保留原链接: ${trimmed} | ${message}`);
    return { url: trimmed, uploaded: false, skipped: false, failed: true };
  }
}

function normalizePayload(payload: AdminProductPayload | null | undefined): AdminProductPayload {
  return {
    coverUrl: payload?.coverUrl ?? null,
    coverAlt: payload?.coverAlt ?? null,
    gallery: payload?.gallery ?? [],
    tags: payload?.tags ?? [],
    attachments: payload?.attachments ?? [],
    certifications: payload?.certifications ?? [],
  };
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-product-images');
  }

  const rows = await db
    .select({
      translationId: productTranslations.id,
      spu: products.spu,
      name: productTranslations.name,
      payload: productTranslations.payload,
    })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(eq(productTranslations.locale, DEFAULT_LOCALE));

  const cache = new Map<string, string>();
  const stats = {
    products: rows.length,
    updated: 0,
    skipped: 0,
    imagesUploaded: 0,
    imagesFailed: 0,
    failed: 0,
  };

  for (const row of rows) {
    const payload = normalizePayload(row.payload as AdminProductPayload | null | undefined);
    const spuKey = safeKeySegment(row.spu);

    const hasPendingImages =
      (payload.coverUrl && (!isAlreadyOnOss(payload.coverUrl) || forceRefresh))
      || payload.gallery.some((item) => item.url && (!isAlreadyOnOss(item.url) || forceRefresh));

    if (!forceRefresh && !hasPendingImages) {
      console.log(`跳过（已是 OSS）: ${row.spu} | ${row.name}`);
      stats.skipped += 1;
      continue;
    }

    let coverUrl = payload.coverUrl;
    if (coverUrl && (!isAlreadyOnOss(coverUrl) || forceRefresh)) {
      const result = await migrateImageUrl(coverUrl, `products/covers/${spuKey}`, cache);
      coverUrl = result.url;
      if (result.uploaded) stats.imagesUploaded += 1;
      if (result.failed) stats.imagesFailed += 1;
    }

    const gallery = [];
    for (let index = 0; index < payload.gallery.length; index += 1) {
      const item = payload.gallery[index];
      if (!item.url?.trim()) continue;

      let url = item.url;
      if (!isAlreadyOnOss(url) || forceRefresh) {
        const result = await migrateImageUrl(url, `products/gallery/${spuKey}-${index + 1}`, cache);
        if (result.failed && isProtectedTechnicalImage(url)) {
          stats.imagesFailed += 1;
          continue;
        }
        url = result.url;
        if (result.uploaded) stats.imagesUploaded += 1;
        if (result.failed) stats.imagesFailed += 1;
      }

      gallery.push({
        ...item,
        url,
      });
    }

    const nextPayload: AdminProductPayload = {
      ...payload,
      coverUrl,
      gallery,
    };

    await db
      .update(productTranslations)
      .set({
        payload: nextPayload,
        updatedAt: new Date(),
      })
      .where(eq(productTranslations.id, row.translationId));

    console.log(`已更新: ${row.spu} | ${row.name}`);
    stats.updated += 1;
  }

  console.log('\n产品图片 OSS 迁移完成:', {
    ...stats,
    uniqueImagesCached: cache.size,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
