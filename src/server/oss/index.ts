/**
 * Aliyun OSS file upload service.
 * Gracefully degrades when credentials are not configured.
 * 
 * SERVER-ONLY MODULE: This file uses Node.js-specific packages (ali-oss, proxy-agent)
 * and must never be imported into client-side components.
 */

'use server';

import { randomUUID } from 'node:crypto';
import path from 'node:path';

type UploadResult =
  | { ok: true; url: string; key: string }
  | { ok: false; error: string };

type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  folder?: string;
};

function getOssConfig() {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.ALIYUN_OSS_BUCKET;
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT;
  const region = process.env.ALIYUN_OSS_REGION;
  const domain = process.env.ALIYUN_OSS_DOMAIN;

  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
    return null;
  }

  return { accessKeyId, accessKeySecret, bucket, endpoint, region, domain: domain?.replace(/\/$/, '') ?? '' };
}

async function createOssClient(config: NonNullable<ReturnType<typeof getOssConfig>>) {
  const OSS = (await import('ali-oss')).default;
  return new OSS({
    region: config.region ?? config.endpoint.replace('https://', '').replace('http://', ''),
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    secure: config.endpoint.startsWith('https'),
    endpoint: config.endpoint,
  });
}

/**
 * Upload a file buffer to Aliyun OSS.
 */
export async function uploadToOss(input: UploadInput): Promise<UploadResult> {
  const config = getOssConfig();

  if (!config) {
    return { ok: false, error: 'Aliyun OSS not configured' };
  }

  try {
    const client = await createOssClient(config);
    const ext = path.extname(input.filename) || '.jpg';
    const folder = input.folder ?? 'uploads';
    const key = `${folder}/${randomUUID()}${ext}`;

    const result = await client.put(key, input.buffer, {
      mime: input.contentType ?? getMimeType(ext),
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    const url = config.domain ? `${config.domain}/${key}` : result.url;

    return { ok: true, url, key };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[oss] Upload failed:', message);
    return { ok: false, error: message };
  }
}

/**
 * Delete a file from Aliyun OSS by key.
 */
export async function deleteFromOss(key: string): Promise<{ ok: boolean; error?: string }> {
  const config = getOssConfig();
  if (!config) return { ok: false, error: 'Aliyun OSS not configured' };

  try {
    const client = await createOssClient(config);
    await client.delete(key);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[oss] Delete failed:', message);
    return { ok: false, error: message };
  }
}

/**
 * Generate a signed URL for temporary private access (e.g. admin preview).
 */
export async function getSignedUrl(key: string, expiresSeconds = 3600): Promise<string | null> {
  const config = getOssConfig();
  if (!config) return null;

  try {
    const client = await createOssClient(config);
    return client.signatureUrl(key, { expires: expiresSeconds });
  } catch {
    return null;
  }
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
