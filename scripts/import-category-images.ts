import '@/lib/env';

import path from 'node:path';

import { eq } from 'drizzle-orm';
import postgres from 'postgres';

import { db } from '@/server/db';
import { categories, categoryTranslations } from '@/server/db/schema';

const DEFAULT_LOCALE = 'en';
const forceRefresh = process.argv.includes('--force');
const directUrlOnly = process.argv.includes('--direct-url');

/** PrestaShop category id from vexmotor.com URL prefix (categories.json). */
const PRESTASHOP_IMAGE_ID_BY_SLUG: Record<string, number> = {
  'stepper-motor': 28,
  'nema-8-stepper-motor': 36,
  'nema-11-stepper-motor': 37,
  'nema-14-stepper-motor': 38,
  'nema-16-stepper-motor': 39,
  'nema-17-stepper-motor': 35,
  'nema-23-stepper-motor': 40,
  'nema-24-stepper-motor': 41,
  'nema-34-stepper-motor': 42,
  'stepper-motor-driver': 43,
  'power-supply': 44,
  'closed-loop-stepper-motor': 47,
  'brushless-dc-motor': 48,
  'brushless-spindle-motor': 50,
  'integrated-stepper-motor': 49,
};

/** When PrestaShop module image is missing, use a representative product/category image. */
const FALLBACK_IMAGE_URL_BY_SLUG: Record<string, string> = {
  'stepper-motor': 'https://www.vexmotor.com/modules/cz_categoryimagelist/views/img/35-cz_categoryimagelist.png',
  'closed-loop-stepper-motor':
    'https://diiospp53gsun.cloudfront.net/geiwohuo/202507/22/integrated-stepper-0-5nm-torque-nema-17-closed-loop-stepper-design-0.jpg',
  'brushless-dc-motor':
    'https://diiospp53gsun.cloudfront.net/geiwohuo/202508/13/57mm-bldc-motor-3000rpm-0-32nm-5-3a-rated-74mm-length-0.png',
  'brushless-spindle-motor':
    'https://diiospp53gsun.cloudfront.net/geiwohuo/202507/22/57mm-brushless-spindle-motor-12000rpm-0-32nm-torque-48v-brushless-motor-controller-120mm-length-0.jpg',
  'integrated-stepper-motor':
    'https://diiospp53gsun.cloudfront.net/geiwohuo/202508/13/4-2a-150n-cm-closed-loop-integrated-motor-57mm-d-shaft-nema-23-integrated-motor-0.png',
};

function vexmotorCategoryImageUrl(prestashopId: number) {
  return `https://www.vexmotor.com/modules/cz_categoryimagelist/views/img/${prestashopId}-cz_categoryimagelist.png`;
}

function extensionFromUrl(url: string) {
  const clean = url.split('?')[0] ?? url;
  const ext = path.extname(clean).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    return ext;
  }
  return '.png';
}

function mimeFromExtension(ext: string) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

async function urlExists(url: string) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!response.ok) return false;
    const length = Number(response.headers.get('content-length') ?? '0');
    return length === 0 || length > 1000;
  } catch {
    return false;
  }
}

async function resolveSourceUrl(slug: string, neonImageUrl: string | null | undefined) {
  if (neonImageUrl?.trim()) {
    return neonImageUrl.trim();
  }

  const prestashopId = PRESTASHOP_IMAGE_ID_BY_SLUG[slug];
  if (prestashopId) {
    const moduleUrl = vexmotorCategoryImageUrl(prestashopId);
    if (await urlExists(moduleUrl)) {
      return moduleUrl;
    }
  }

  return FALLBACK_IMAGE_URL_BY_SLUG[slug] ?? null;
}

async function loadNeonImageBySlug() {
  const connectionString = process.env.STEPMOTECH_DATABASE_URL;
  if (!connectionString) return new Map<string, string>();

  const sql = postgres(connectionString, { max: 1 });
  try {
    const rows = await sql<{ slug: string; image_url: string | null }[]>`
      SELECT slug, image_url FROM categories WHERE status = 'active'
    `;
    return new Map(rows.filter((row) => row.image_url).map((row) => [row.slug, row.image_url!]));
  } catch (error) {
    console.warn('连接 stepmotech Neon 失败，跳过 Neon 图片源:', error);
    return new Map<string, string>();
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function getOssClient() {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.ALIYUN_OSS_BUCKET;
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT;
  const region = process.env.ALIYUN_OSS_REGION;
  const domain = process.env.ALIYUN_OSS_DOMAIN?.replace(/\/$/, '');

  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint || !domain) {
    throw new Error('Aliyun OSS 未配置，无法上传分类图片');
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

async function persistCategoryImage(
  slug: string,
  sourceUrl: string,
  buffer: Buffer,
  contentType: string,
) {
  if (directUrlOnly) {
    return { mode: 'direct' as const, url: sourceUrl };
  }

  try {
    const ext = extensionFromUrl(sourceUrl);
    const key = `categories/${slug}${ext}`;
    const ossUrl = await uploadToOssKey(key, buffer, contentType);
    return { mode: 'oss' as const, url: ossUrl };
  } catch (error) {
    console.warn(`OSS 上传失败，改用源 URL: ${slug}`, error instanceof Error ? error.message : error);
    return { mode: 'direct' as const, url: sourceUrl };
  }
}

async function downloadImage(url: string) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`下载失败 ${response.status}: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`图片过小 (${buffer.length} bytes): ${url}`);
  }
  const contentType = response.headers.get('content-type') ?? mimeFromExtension(extensionFromUrl(url));
  return { buffer, contentType };
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:import-category-images');
  }

  const neonImageBySlug = await loadNeonImageBySlug();
  const rows = await db
    .select({
      categoryId: categories.id,
      slug: categoryTranslations.slug,
      name: categoryTranslations.name,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
    .where(eq(categoryTranslations.locale, DEFAULT_LOCALE));

  const stats = { uploaded: 0, oss: 0, direct: 0, skipped: 0, failed: 0 };

  for (const row of rows) {
    if (row.imageUrl && !forceRefresh) {
      console.log(`跳过（已有图片）: ${row.name} (${row.slug})`);
      stats.skipped += 1;
      continue;
    }

    const sourceUrl = await resolveSourceUrl(row.slug, neonImageBySlug.get(row.slug));
    if (!sourceUrl) {
      console.warn(`未找到图片来源: ${row.slug}`);
      stats.failed += 1;
      continue;
    }

    try {
      if (directUrlOnly) {
        await db
          .update(categories)
          .set({ imageUrl: sourceUrl, updatedAt: new Date() })
          .where(eq(categories.id, row.categoryId));
        console.log(`已写入 (direct): ${row.name} (${row.slug}) <- ${sourceUrl}`);
        stats.uploaded += 1;
        stats.direct += 1;
        continue;
      }

      const { buffer, contentType } = await downloadImage(sourceUrl);
      const persisted = await persistCategoryImage(row.slug, sourceUrl, buffer, contentType);

      await db
        .update(categories)
        .set({ imageUrl: persisted.url, updatedAt: new Date() })
        .where(eq(categories.id, row.categoryId));

      console.log(`已写入 (${persisted.mode}): ${row.name} (${row.slug}) <- ${sourceUrl}`);
      stats.uploaded += 1;
      if (persisted.mode === 'oss') stats.oss += 1;
      else stats.direct += 1;
    } catch (error) {
      console.error(`失败: ${row.slug}`, error);
      stats.failed += 1;
    }
  }

  console.log('\n分类图片导入完成:', {
    ...stats,
    total: rows.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
