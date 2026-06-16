const TRACKING_TOKEN_PATTERN = /(window\.|document\.|dataLayer|gtag|addEventListener|querySelector|MutationObserver|wpcf7|send_to|console\.|function\s*\(|=>|googleads|googletagmanager|\bAW-\d+)/i;
const CODE_SIGNAL_PATTERN = /\b(const|let|var|function|if|return|throw|querySelector|checkValidity|closest|replace|trim|toLowerCase)\b|[{};]/gi;

/**
 * Convert imported legacy CMS HTML into short, readable storefront copy.
 * It strips script/style payloads and drops JS-like fragments that occasionally leak into CMS fields.
 */
export function sanitizeLegacyCopy(content: string | null | undefined): string {
  if (!content) {
    return '';
  }

  const plainText = content
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!plainText) {
    return '';
  }

  const codeSignalCount = plainText.match(CODE_SIGNAL_PATTERN)?.length ?? 0;
  if (codeSignalCount > 12) {
    return '';
  }

  const sentences = plainText
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .filter((segment) => segment.length <= 220)
    .filter((segment) => !(segment.match(CODE_SIGNAL_PATTERN)?.length ?? 0))
    .filter((segment) => !TRACKING_TOKEN_PATTERN.test(segment));

  if (sentences.length === 0) {
    return '';
  }

  return sentences.join(' ').replace(/\s{2,}/g, ' ').trim();
}
