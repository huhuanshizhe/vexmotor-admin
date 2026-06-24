import { pinyin } from 'pinyin-pro';

const CJK_SEGMENT_PATTERN = /[\u3400-\u9fff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]+/gu;

export function transliterateSlugSource(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  return trimmed.replace(CJK_SEGMENT_PATTERN, (segment) => (
    pinyin(segment, { toneType: 'none', separator: ' ' })
  ));
}

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSlugFromText(text: string): string {
  return normalizeSlug(transliterateSlugSource(text));
}

export function resolveSlugForSave(input: { sourceText: string; slug?: string | null }): string | null {
  const manualSlug = input.slug?.trim();
  if (manualSlug) return normalizeSlug(manualSlug) || null;

  const sourceText = input.sourceText.trim();
  if (!sourceText) return null;

  return generateSlugFromText(sourceText) || null;
}

export type DraftSlugValidation =
  | { ok: true; autoSlug?: string }
  | { ok: false; locale: string; message: string; section: 'content' | 'seo' };

export function validateSourceThenAutoSlug(input: {
  locale: string;
  sourceText: string;
  slug: string;
  emptySourceMessage: string;
  section?: 'content' | 'seo';
}): DraftSlugValidation {
  const section = input.section ?? 'content';
  if (!input.sourceText.trim()) {
    return { ok: false, locale: input.locale, message: input.emptySourceMessage, section };
  }

  const manualSlug = input.slug.trim();
  if (manualSlug) {
    return { ok: true };
  }

  const autoSlug = generateSlugFromText(input.sourceText);
  if (!autoSlug) {
    return { ok: false, locale: input.locale, message: '无法根据名称生成 slug，请手动填写', section: 'seo' };
  }

  return { ok: true, autoSlug };
}
