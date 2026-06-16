#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ORIGIN = 'https://www.vexmotor.com';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 4;

function parseArgs(argv) {
  const args = {
    origin: DEFAULT_ORIGIN,
    outDir: path.resolve(process.cwd(), 'migration', 'vexmotor'),
    sitemap: '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
    maxProducts: 0,
    maxCategories: 0,
    maxArticles: 0,
    maxPages: 0,
    rewriteHostFrom: 'www.stepmotech.com,stepmotech.com',
    rewriteHostTo: 'www.vexmotor.com',
    includeUrls: '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) {
      continue;
    }

    const key = part.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }

  args.timeoutMs = Number(args.timeoutMs) || DEFAULT_TIMEOUT_MS;
  args.concurrency = Math.max(1, Number(args.concurrency) || DEFAULT_CONCURRENCY);
  args.maxProducts = Math.max(0, Number(args.maxProducts) || 0);
  args.maxCategories = Math.max(0, Number(args.maxCategories) || 0);
  args.maxArticles = Math.max(0, Number(args.maxArticles) || 0);
  args.maxPages = Math.max(0, Number(args.maxPages) || 0);
  args.rewriteHostFrom = String(args.rewriteHostFrom ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  args.rewriteHostTo = String(args.rewriteHostTo ?? '').trim().toLowerCase();
  args.includeUrls = String(args.includeUrls ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return args;
}

function decodeXmlText(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-');
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'vexmotor-migration-bot/1.0 (+https://www.stepmotech.online)',
        accept: 'text/html,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractLocEntries(xmlText) {
  const values = [];
  const regex = /<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi;
  for (const match of xmlText.matchAll(regex)) {
    const loc = decodeXmlText(match[1] ?? '');
    if (loc) {
      values.push(loc);
    }
  }
  return values;
}

function isSitemapIndex(xmlText) {
  return /<sitemapindex\b/i.test(xmlText);
}

function extractRobotsSitemaps(robotsText) {
  const values = [];
  const regex = /^\s*Sitemap:\s*(\S+)\s*$/gim;
  for (const match of robotsText.matchAll(regex)) {
    values.push(match[1]);
  }
  return values;
}

function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function rewriteUrlHost(rawUrl, fromHosts, toHost) {
  if (!toHost || !fromHosts.length) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    if (fromHosts.includes(url.hostname.toLowerCase())) {
      url.hostname = toHost;
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function normalizeSourceUrl(rawUrl, fromHosts, toHost) {
  const normalized = normalizeUrl(rewriteUrlHost(rawUrl, fromHosts, toHost));
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.pathname.toLowerCase().endsWith('.html')) {
      url.pathname = url.pathname.replace(/\/(\d+)-\d+-([^/]+\.html)$/i, '/$1-$2');
    }
    return url.toString();
  } catch {
    return normalized;
  }
}

function classifyUrl(rawUrl) {
  const url = new URL(rawUrl);
  const pathname = url.pathname.toLowerCase();
  const normalizedPathname = pathname.replace(/^\/(en|es|de|fr)(?=\/)/, '');

  if (normalizedPathname.includes('/blog/')) {
    return 'article';
  }

  if (normalizedPathname.endsWith('.html') && /\/\d+-/.test(normalizedPathname)) {
    return 'product';
  }

  if (/\/[a-z0-9-]+-\d+\/?$/.test(normalizedPathname) && !normalizedPathname.endsWith('.html')) {
    return 'category';
  }

  if (
    normalizedPathname === '/' ||
    normalizedPathname.startsWith('/content/') ||
    normalizedPathname.startsWith('/about') ||
    normalizedPathname.startsWith('/contact')
  ) {
    return 'page';
  }

  return 'other';
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : null;
}

function extractMetaDescription(html) {
  const regex = /<meta[^>]+name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i;
  const altRegex = /<meta[^>]+content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i;
  const match = html.match(regex) ?? html.match(altRegex);
  return match ? decodeXmlText(match[1]) : null;
}

function extractCanonical(html) {
  const regex = /<link[^>]+rel=["']canonical["'][^>]*href=["']([\s\S]*?)["'][^>]*>/i;
  const altRegex = /<link[^>]+href=["']([\s\S]*?)["'][^>]*rel=["']canonical["'][^>]*>/i;
  const match = html.match(regex) ?? html.match(altRegex);
  return match ? match[1].trim() : null;
}

function extractFirstHeading(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : null;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(regex)) {
    const raw = (match[1] ?? '').trim();
    if (!raw) {
      continue;
    }
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      continue;
    }
  }
  return blocks;
}

function flattenJsonLd(values) {
  const out = [];
  const pushValue = (value) => {
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === 'object' && value['@graph'] && Array.isArray(value['@graph'])) {
      value['@graph'].forEach(pushValue);
      return;
    }
    out.push(value);
  };

  values.forEach(pushValue);
  return out;
}

function extractProductFromJsonLd(jsonLdItems) {
  const all = flattenJsonLd(jsonLdItems);
  const product = all.find((item) => {
    const type = item?.['@type'];
    if (Array.isArray(type)) {
      return type.includes('Product');
    }
    return type === 'Product';
  });

  if (!product) {
    return null;
  }

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const imageValues = Array.isArray(product.image) ? product.image : product.image ? [product.image] : [];

  return {
    name: product.name ?? null,
    sku: product.sku ?? null,
    mpn: product.mpn ?? null,
    description: product.description ?? null,
    brand: typeof product.brand === 'object' ? (product.brand?.name ?? null) : product.brand ?? null,
    price: offers?.price ?? null,
    currency: offers?.priceCurrency ?? null,
    availability: offers?.availability ?? null,
    images: imageValues,
  };
}

function extractBodyHtml(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] ?? html;
}

function extractProductDetailHtml(html) {
  const bodyHtml = extractBodyHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');

  const cutoffMarkers = [/Related Products/i, /Subscribe To Our Newsletter/i, /Additional Links/i];
  let cutoffIndex = bodyHtml.length;

  for (const marker of cutoffMarkers) {
    const index = bodyHtml.search(marker);
    if (index >= 0) {
      cutoffIndex = Math.min(cutoffIndex, index);
    }
  }

  return bodyHtml.slice(0, cutoffIndex);
}

function stripTagsPreserveBreaks(value) {
  return decodeXmlText(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/section>/gi, '\n')
      .replace(/<\/article>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/✅/g, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' '),
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractProductDescriptionLong(html, fallbackText = '') {
  const detailText = stripTagsPreserveBreaks(extractProductDetailHtml(html));
  if (!detailText) {
    return fallbackText || null;
  }

  const lines = detailText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let startIndex = 0;
  lines.forEach((line, index) => {
    if (/(add to cart|add to wishlist|add to compare|question|share|reference:|need more\?|\$\d)/i.test(line)) {
      startIndex = index + 1;
    }
  });

  let contentLines = lines.slice(startIndex).filter((line) => {
    if (line.length < 2) {
      return false;
    }

    return !/^(home|products|categories|cart|wishlist|login|register|menu|support|contact|facebook|pinterest|whatsapp|subscribe to our newsletter|catalog|description|specifications|dimensions|torque curves|custom design|downloads|rviews|reviews)$/i.test(line);
  });

  const preferredStart = contentLines.findIndex((line) => /^(description|overview|applications|ideal for|why pick|key |this |precision )/i.test(line));
  if (preferredStart > 0) {
    contentLines = contentLines.slice(preferredStart);
  }

  const preferredEnd = contentLines.findIndex((line) => /^(reference|file|comments \(\d+\)|write your review|your review appreciation|your review cannot be sent|report comment|review sent|download)$/i.test(line));
  if (preferredEnd > 0) {
    contentLines = contentLines.slice(0, preferredEnd);
  }

  const normalized = contentLines
    .join('\n')
    .replace(/([a-z0-9)])([A-Z][A-Za-z][A-Za-z0-9 /()%-]+:)/g, '$1\n$2')
    .replace(/\n•\s*/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length < 80) {
    return fallbackText || null;
  }

  return normalized.slice(0, 6000);
}

function normalizeSpecKey(value) {
  const key = value.replace(/[•✅]/g, '').replace(/\s+/g, ' ').trim();
  const lower = key.toLowerCase();

  if (lower === 'rated current/phase') return 'Rated Current';
  if (lower === 'motor length') return 'Body Length';
  if (lower === 'lead wires') return 'Wire Count';
  if (lower === 'lead length') return 'Lead Length';
  if (lower === 'frame size') return 'Frame Size';
  if (lower === 'shaft diameter') return 'Shaft Diameter';
  if (lower === 'shaft length') return 'Shaft Length';
  if (lower === 'd-cut length') return 'D-cut Length';
  if (lower === 'phase resistance') return 'Phase Resistance';
  if (lower === 'step angle') return 'Step Angle';
  if (lower === 'holding torque') return 'Holding Torque';

  return key;
}

function splitSpecValueAndUnit(rawValue) {
  const value = rawValue.replace(/\s+/g, ' ').trim();
  const simpleMatch = value.match(/^(-?\d+(?:\.\d+)?)(?:\s*)([A-Za-z°Ω·/._%-]{1,40})$/);

  if (!simpleMatch) {
    return { value, unit: null };
  }

  return {
    value: simpleMatch[1],
    unit: simpleMatch[2],
  };
}

function isNoiseImage(url) {
  return /logo|icon|banner|sprite|paypal|visa|master|discover|american_express|question-mark|newsletter|social|flag|favicon|ets_megamenu|free-shipping|\/img\/l\/|\/img\/m\/|\/img\/su\/|\/img\/co\/|\/img\/st\/|\/img\/home\//i.test(url);
}

function extractProductGalleryImages(html, origin, ldImages = []) {
  const productHtml = extractProductDetailHtml(html);
  const values = [];

  for (const value of ldImages) {
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }
    try {
      values.push(new URL(value, origin).toString());
    } catch {
      continue;
    }
  }

  const imageAttributeRegex = /(?:src|data-src|data-image-large-src|data-zoom-image|href)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^"']*)?)["']/gi;
  for (const match of productHtml.matchAll(imageAttributeRegex)) {
    const src = (match[1] ?? '').trim();
    if (!src) {
      continue;
    }

    const marker = src.toLowerCase();
    if (isNoiseImage(marker)) {
      continue;
    }

    try {
      values.push(new URL(src, origin).toString());
    } catch {
      continue;
    }
  }

  return [...new Set(values)].slice(0, 12);
}

function guessMimeTypeFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lower.endsWith('.step') || lower.endsWith('.stp')) {
    return 'application/step';
  }
  if (lower.endsWith('.dxf')) {
    return 'image/vnd.dxf';
  }
  if (lower.endsWith('.dwg')) {
    return 'image/vnd.dwg';
  }
  if (lower.endsWith('.iges') || lower.endsWith('.igs')) {
    return 'model/iges';
  }
  if (lower.endsWith('.zip')) {
    return 'application/zip';
  }
  return 'application/octet-stream';
}

function extractDownloadAssets(html, origin) {
  const productHtml = extractProductDetailHtml(html);
  const values = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const allowedExtensions = ['.pdf', '.step', '.stp', '.dxf', '.dwg', '.igs', '.iges', '.zip'];

  for (const match of productHtml.matchAll(linkRegex)) {
    const hrefRaw = (match[1] ?? '').trim();
    const label = stripTags(match[2] ?? '').trim();
    if (!hrefRaw) {
      continue;
    }

    let absolute;
    try {
      absolute = new URL(hrefRaw, origin).toString();
    } catch {
      continue;
    }

    const lower = absolute.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some((extension) => lower.includes(extension));
    const labelMarker = `${label} ${absolute}`.toLowerCase();
    const looksLikeDrawing = labelMarker.includes('datasheet') || labelMarker.includes('drawing') || labelMarker.includes('cad') || labelMarker.includes('2d') || labelMarker.includes('3d') || labelMarker.includes('spec');
    if (!hasAllowedExtension && !looksLikeDrawing) {
      continue;
    }

    values.push({
      url: absolute,
      label: label || 'Technical document',
      mimeType: guessMimeTypeFromUrl(absolute),
    });
  }

  const dedup = new Map();
  for (const item of values) {
    if (!dedup.has(item.url)) {
      dedup.set(item.url, item);
    }
  }

  return [...dedup.values()].slice(0, 10);
}

function extractTechnicalSpecs(text) {
  if (!text) {
    return [];
  }

  const source = text.replace(/_/g, ' ').replace(/[，]+/g, ' ').replace(/✅/g, '\n');
  const specs = [];
  const rules = [
    { key: 'Step Angle', regex: /(\d+(?:\.\d+)?)\s*°\s*step/i, unit: 'deg' },
    { key: 'Holding Torque', regex: /(\d+(?:\.\d+)?)\s*N\s*[·.]?\s*cm\s*torque/i, unit: 'N.cm' },
    { key: 'Rated Current', regex: /(\d+(?:\.\d+)?)\s*A\s*current/i, unit: 'A' },
    { key: 'Body Length', regex: /(\d+(?:\.\d+)?)\s*mm\s*body/i, unit: 'mm' },
    { key: 'Wire Count', regex: /(\d+)\s*[- ]?wire/i, unit: 'wire' },
  ];

  for (const rule of rules) {
    const match = source.match(rule.regex);
    if (!match?.[1]) {
      continue;
    }
    specs.push({ key: rule.key, value: match[1], unit: rule.unit });
  }

  const normalizedLines = source
    .replace(/([a-z0-9)])([A-Z][A-Za-z][A-Za-z0-9 /()%-]+:)/g, '$1\n$2')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of normalizedLines) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 /().%-]{1,60}):\s*(.+)$/);
    if (!match) {
      continue;
    }

    const key = normalizeSpecKey(match[1]);
    const rawValue = match[2].trim();
    if (!key || !rawValue || /(add to cart|wishlist|compare|related products)/i.test(rawValue)) {
      continue;
    }

    const parsedValue = splitSpecValueAndUnit(rawValue);
    specs.push({ key, value: parsedValue.value, unit: parsedValue.unit });
  }

  const dedup = new Map();
  for (const spec of specs) {
    dedup.set(spec.key, spec);
  }
  return [...dedup.values()];
}

function extractBannerImages(html, origin) {
  const values = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(regex)) {
    const src = match[1];
    if (!src) {
      continue;
    }

    const marker = src.toLowerCase();
    const looksLikeBanner = marker.includes('slider') || marker.includes('banner') || marker.includes('homeslide') || marker.includes('imageslider');
    if (!looksLikeBanner) {
      continue;
    }

    try {
      const absolute = new URL(src, origin).toString();
      values.push(absolute);
    } catch {
      continue;
    }
  }

  return [...new Set(values)];
}

function extractAnchorUrls(html, origin) {
  const values = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(regex)) {
    const href = (match[1] ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    try {
      const url = new URL(href, origin);
      values.push(url.toString());
    } catch {
      continue;
    }
  }

  return [...new Set(values)];
}

function extractFooter(html, origin) {
  const matches = [...html.matchAll(/<footer[\s\S]*?<\/footer>/gi)].map((item) => item[0]);
  const footerHtml =
    matches
      .map((section) => ({ section, score: stripTags(section).length }))
      .sort((a, b) => b.score - a.score)[0]?.section ?? '';

  const links = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of footerHtml.matchAll(linkRegex)) {
    const hrefRaw = match[1]?.trim();
    const label = stripTags(match[2] ?? '');
    if (!hrefRaw || !label) {
      continue;
    }

    try {
      links.push({ href: new URL(hrefRaw, origin).toString(), label });
    } catch {
      links.push({ href: hrefRaw, label });
    }
  }

  return {
    html: footerHtml,
    text: stripTags(footerHtml),
    links,
  };
}

async function mapLimit(items, limit, worker) {
  const queue = [...items];
  const results = [];

  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const value = await worker(next);
      if (value !== null) {
        results.push(value);
      }
    }
  });

  await Promise.all(runners);
  return results;
}

function trimByLimit(items, max) {
  if (!max || max <= 0) {
    return items;
  }
  return items.slice(0, max);
}

async function resolveSitemaps(origin, preferredSitemap, timeoutMs) {
  const start = [];

  if (preferredSitemap) {
    start.push(preferredSitemap);
  }

  try {
    const robotsUrl = new URL('/robots.txt', origin).toString();
    const robots = await fetchText(robotsUrl, timeoutMs);
    start.push(...extractRobotsSitemaps(robots));
  } catch {
    // ignore robots fetch failures
  }

  start.push(new URL('/sitemap.xml', origin).toString());

  const queue = [...new Set(start)];
  const visited = new Set();
  const urlEntries = new Set();

  while (queue.length) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || visited.has(sitemapUrl)) {
      continue;
    }

    visited.add(sitemapUrl);

    let xml;
    try {
      // eslint-disable-next-line no-await-in-loop
      xml = await fetchText(sitemapUrl, timeoutMs);
    } catch {
      continue;
    }

    const locs = extractLocEntries(xml);
    if (isSitemapIndex(xml)) {
      locs.forEach((loc) => {
        const normalized = normalizeUrl(loc);
        if (normalized && !visited.has(normalized)) {
          queue.push(normalized);
        }
      });
      continue;
    }

    locs.forEach((loc) => {
      const normalized = normalizeUrl(loc);
      if (normalized) {
        urlEntries.add(normalized);
      }
    });
  }

  return [...urlEntries];
}

async function main() {
  const args = parseArgs(process.argv);
  const origin = args.origin;

  await mkdir(args.outDir, { recursive: true });

  const allUrls = await resolveSitemaps(origin, args.sitemap, args.timeoutMs);

  let homeHtml = '';
  try {
    homeHtml = await fetchText(origin, args.timeoutMs);
  } catch {
    // ignore
  }

  const discoveredFromHome = extractAnchorUrls(homeHtml, origin).filter((url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const sourceHosts = [new URL(origin).hostname.toLowerCase(), ...args.rewriteHostFrom, args.rewriteHostTo].filter(Boolean);
      return sourceHosts.includes(host);
    } catch {
      return false;
    }
  });

  const mergedUrlSet = new Set([...allUrls, ...discoveredFromHome]);
  args.includeUrls.forEach((item) => {
    const normalized = normalizeUrl(item);
    if (normalized) {
      mergedUrlSet.add(normalized);
    }
  });
  const mergedUrls = [
    ...new Set([...mergedUrlSet].map((url) => normalizeSourceUrl(url, args.rewriteHostFrom, args.rewriteHostTo)).filter(Boolean)),
  ];

  const grouped = {
    product: [],
    category: [],
    article: [],
    page: [],
    other: [],
  };

  for (const url of mergedUrls) {
    const kind = classifyUrl(url);
    grouped[kind].push(url);
  }

  const productUrls = trimByLimit(grouped.product, args.maxProducts);
  const categoryUrls = trimByLimit(grouped.category, args.maxCategories);
  const articleUrls = trimByLimit(grouped.article, args.maxArticles);
  const pageUrls = trimByLimit(grouped.page, args.maxPages);

  const scrapePage = async (url, kind) => {
    const fetchUrl = rewriteUrlHost(url, args.rewriteHostFrom, args.rewriteHostTo);
    try {
      const html = await fetchText(fetchUrl, args.timeoutMs);
      const jsonLd = extractJsonLdBlocks(html);
      return {
        kind,
        url,
        fetchUrl,
        title: extractTitle(html),
        seoDescription: extractMetaDescription(html),
        canonical: extractCanonical(html),
        heading: extractFirstHeading(html),
        jsonLdCount: jsonLd.length,
        jsonLd,
        html,
      };
    } catch (error) {
      return {
        kind,
        url,
        fetchUrl,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const [productPages, categoryPages, articlePages, staticPages] = await Promise.all([
    mapLimit(productUrls, args.concurrency, (url) => scrapePage(url, 'product')),
    mapLimit(categoryUrls, args.concurrency, (url) => scrapePage(url, 'category')),
    mapLimit(articleUrls, args.concurrency, (url) => scrapePage(url, 'article')),
    mapLimit(pageUrls, args.concurrency, (url) => scrapePage(url, 'page')),
  ]);

  const discoveredCategoryProductUrls = trimByLimit(
    [
      ...new Set(
        categoryPages.flatMap((item) => {
          if (item.error || !item.html) {
            return [];
          }

          return extractAnchorUrls(item.html, origin)
            .map((url) => normalizeSourceUrl(url, args.rewriteHostFrom, args.rewriteHostTo))
            .filter((url) => url && classifyUrl(url) === 'product');
        }),
      ),
    ],
    args.maxProducts,
  );
  const missingCategoryProductUrls = discoveredCategoryProductUrls.filter((url) => !productUrls.includes(url));
  const discoveredProductPages = await mapLimit(missingCategoryProductUrls, args.concurrency, (url) => scrapePage(url, 'product'));
  const allProductPages = [...productPages, ...discoveredProductPages];

  const rawProducts = allProductPages.map((item) => {
    if (item.error) {
      return {
        url: item.url,
        fetchUrl: item.fetchUrl,
        error: item.error,
      };
    }

    const ldProduct = extractProductFromJsonLd(item.jsonLd ?? []);
    const descriptionLong = extractProductDescriptionLong(item.html ?? '', ldProduct?.description ?? item.seoDescription ?? '');
    const galleryImages = extractProductGalleryImages(item.html ?? '', origin, ldProduct?.images ?? []);
    const downloads = extractDownloadAssets(item.html ?? '', origin);
    const technicalSpecs = extractTechnicalSpecs(`${item.heading ?? ''}\n${item.title ?? ''}\n${descriptionLong ?? ''}\n${ldProduct?.description ?? ''}`);

    return {
      url: item.url,
      fetchUrl: item.fetchUrl,
      title: item.title,
      heading: item.heading,
      seoTitle: item.title,
      seoDescription: item.seoDescription,
      canonical: item.canonical,
      ldProduct,
      descriptionLong,
      galleryImages,
      downloads,
      technicalSpecs,
    };
  });

  const products = [];
  const seenProductKeys = new Set();

  for (const item of rawProducts) {
    const candidateUrl = item.canonical ?? item.url ?? item.fetchUrl ?? '';
    const identity = normalizeSourceUrl(candidateUrl, args.rewriteHostFrom, args.rewriteHostTo) ?? candidateUrl;

    if (seenProductKeys.has(identity)) {
      continue;
    }

    seenProductKeys.add(identity);
    products.push(item);
  }

  const categories = categoryPages.map((item) => {
    if (item.error) {
      return {
        url: item.url,
        fetchUrl: item.fetchUrl,
        error: item.error,
      };
    }

    return {
      url: item.url,
      fetchUrl: item.fetchUrl,
      title: item.title,
      heading: item.heading,
      seoTitle: item.title,
      seoDescription: item.seoDescription,
      canonical: item.canonical,
    };
  });

  const articles = articlePages.map((item) => {
    if (item.error) {
      return {
        url: item.url,
        fetchUrl: item.fetchUrl,
        error: item.error,
      };
    }

    const articleHtmlMatch = item.html?.match(/<article[\s\S]*?<\/article>/i) ?? null;
    return {
      url: item.url,
      fetchUrl: item.fetchUrl,
      title: item.title,
      heading: item.heading,
      seoTitle: item.title,
      seoDescription: item.seoDescription,
      canonical: item.canonical,
      bodyTextExcerpt: stripTags(articleHtmlMatch ? articleHtmlMatch[0] : item.html ?? '').slice(0, 2400),
    };
  });

  const pages = staticPages.map((item) => {
    if (item.error) {
      return {
        url: item.url,
        fetchUrl: item.fetchUrl,
        error: item.error,
      };
    }

    return {
      url: item.url,
      fetchUrl: item.fetchUrl,
      title: item.title,
      heading: item.heading,
      seoTitle: item.title,
      seoDescription: item.seoDescription,
      canonical: item.canonical,
      bodyTextExcerpt: stripTags(item.html ?? '').slice(0, 2000),
    };
  });

  const banner = {
    source: origin,
    images: extractBannerImages(homeHtml, origin),
  };

  const footer = extractFooter(homeHtml, origin);

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceOrigin: origin,
    sitemapInput: args.sitemap || null,
    totals: {
      sitemapUrls: allUrls.length,
      discoveredFromHome: discoveredFromHome.length,
      mergedUrls: mergedUrls.length,
      productsFound: grouped.product.length,
      categoryDiscoveredProductUrls: discoveredCategoryProductUrls.length,
      categoriesFound: grouped.category.length,
      articlesFound: grouped.article.length,
      pagesFound: grouped.page.length,
    },
    sampled: {
      products: products.length,
      categories: categoryUrls.length,
      articles: articleUrls.length,
      pages: pageUrls.length,
    },
  };

  const files = [
    ['manifest.json', manifest],
    ['products.json', products],
    ['categories.json', categories],
    ['articles.json', articles],
    ['pages.json', pages],
    ['banner.json', banner],
    ['footer.json', footer],
    ['urls.json', grouped],
  ];

  await Promise.all(
    files.map(async ([file, payload]) => {
      const fullPath = path.join(args.outDir, file);
      await writeFile(fullPath, JSON.stringify(payload, null, 2), 'utf8');
    }),
  );

  process.stdout.write(`Migration snapshot generated in ${args.outDir}\n`);
  process.stdout.write(JSON.stringify(manifest, null, 2));
  process.stdout.write('\n');
}

main().catch((error) => {
  process.stderr.write(`Migration snapshot failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
