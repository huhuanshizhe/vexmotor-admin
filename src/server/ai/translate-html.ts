const PRESERVED_ATTR_NAMES = ['class', 'id', 'href', 'src', 'alt', 'target', 'rel', 'data-language'] as const;

type HtmlTagToken = {
  type: 'open' | 'close' | 'self';
  name: string;
  attrs: Record<string, string>;
};

const SELF_CLOSING = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

function parseAttrString(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function tokenizeHtml(html: string): HtmlTagToken[] {
  const tokens: HtmlTagToken[] = [];
  const tagRegex = /<\/?([a-zA-Z][\w-]*)([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const raw = match[0];
    const name = match[1].toLowerCase();
    const attrString = match[2] ?? '';
    const isClosing = raw.startsWith('</');
    const isSelf = !isClosing && (raw.endsWith('/>') || SELF_CLOSING.has(name));

    if (isClosing) {
      tokens.push({ type: 'close', name, attrs: {} });
      continue;
    }

    tokens.push({
      type: isSelf ? 'self' : 'open',
      name,
      attrs: parseAttrString(attrString),
    });
  }

  return tokens;
}

function pickPreservedAttrs(attrs: Record<string, string>) {
  const picked: Record<string, string> = {};
  for (const key of PRESERVED_ATTR_NAMES) {
    if (attrs[key]) picked[key] = attrs[key];
  }
  return picked;
}

function serializeToken(token: HtmlTagToken) {
  if (token.type === 'close') return `</${token.name}>`;
  const attrParts = Object.entries(pickPreservedAttrs(token.attrs))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
  if (token.type === 'self') return `<${token.name}${attrParts}/>`;
  return `<${token.name}${attrParts}>`;
}

/** Strip text nodes; keep tag sequence and preserved attributes for structure comparison. */
export function extractHtmlSkeleton(html: string): string {
  return tokenizeHtml(html).map(serializeToken).join('');
}

export class HtmlStructureMismatchError extends Error {
  status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'HtmlStructureMismatchError';
  }
}

export function assertHtmlStructurePreserved(source: string, translated: string) {
  const sourceSkeleton = extractHtmlSkeleton(source);
  const translatedSkeleton = extractHtmlSkeleton(translated);
  if (sourceSkeleton !== translatedSkeleton) {
    throw new HtmlStructureMismatchError('Translated HTML structure does not match source');
  }
}

/** Copy class/id/href/src from source tags onto translated HTML when tag sequence matches. */
export function repairHtmlAttributes(source: string, translated: string): string {
  const sourceTokens = tokenizeHtml(source);
  const translatedTokens = tokenizeHtml(translated);

  if (sourceTokens.length !== translatedTokens.length) {
    return translated;
  }

  let result = '';
  let lastIndex = 0;
  const tagRegex = /<\/?([a-zA-Z][\w-]*)([^>]*?)\/?>/g;
  let tokenIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(translated)) !== null) {
    const sourceToken = sourceTokens[tokenIndex];
    const translatedToken = translatedTokens[tokenIndex];
    tokenIndex += 1;
    if (!sourceToken || !translatedToken) break;
    if (sourceToken.name !== translatedToken.name || sourceToken.type !== translatedToken.type) {
      return translated;
    }

    result += translated.slice(lastIndex, match.index);

    const mergedAttrs = { ...translatedToken.attrs };
    for (const key of PRESERVED_ATTR_NAMES) {
      if (sourceToken.attrs[key]) {
        mergedAttrs[key] = sourceToken.attrs[key];
      }
    }

    const rebuilt = serializeToken({ ...translatedToken, attrs: mergedAttrs });
    result += rebuilt;
    lastIndex = match.index + match[0].length;
  }

  result += translated.slice(lastIndex);
  return tokenIndex === translatedTokens.length ? result : translated;
}

export function stripMarkdownCodeFence(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}
