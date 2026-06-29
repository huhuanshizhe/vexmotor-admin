import { textToSlug } from '@/lib/slug';

const ENTITY_KEY_PATTERN = /^[a-z]+(?:-[a-z]+)*$/;

export function normalizeEntityKeyInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z-]/g, '');
}

export function normalizeEntityKeyForSave(value: string): string | null {
  const normalized = normalizeEntityKeyInput(value)
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized || !ENTITY_KEY_PATTERN.test(normalized)) return null;
  return normalized;
}

export function resolveEntityKeyForSave(input: { key: string; sourceText: string }): string | null {
  const fromKey = normalizeEntityKeyForSave(input.key);
  if (fromKey) return fromKey;

  const fromSource = normalizeEntityKeyForSave(textToSlug(input.sourceText));
  return fromSource || null;
}
