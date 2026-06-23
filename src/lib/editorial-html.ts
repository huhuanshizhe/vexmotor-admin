const EMPTY_HTML_PATTERNS = [
  /^<p><br><\/p>$/i,
  /^<p><br\/><\/p>$/i,
  /^<p>\s*<\/p>$/i,
  /^<p>&nbsp;<\/p>$/i,
  /^<p><br[^>]*><\/p>$/i,
];

export function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasMeaningfulHtmlBody(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return false;
  if (EMPTY_HTML_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  return stripHtmlToText(trimmed).length > 0;
}

export function normalizeBodyForComparison(html: string) {
  const trimmed = html.trim();
  if (!hasMeaningfulHtmlBody(trimmed)) return '';
  return trimmed;
}

export function isEditorialDraftEffectivelyEmpty(values: {
  title?: string;
  slug?: string;
  summary?: string;
  body?: string;
  coverUrl?: string;
  coverAlt?: string;
  tagsText?: string;
  relatedProductSlugsText?: string;
  seoTitle?: string;
  seoDescription?: string;
}) {
  const textFields = [
    values.title,
    values.slug,
    values.summary,
    values.coverUrl,
    values.coverAlt,
    values.tagsText,
    values.relatedProductSlugsText,
    values.seoTitle,
    values.seoDescription,
  ];
  if (textFields.some((value) => value?.trim())) return false;
  return !hasMeaningfulHtmlBody(values.body ?? '');
}
