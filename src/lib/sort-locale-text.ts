import { pinyin } from 'pinyin-pro';

const CJK_FIRST_CHAR_PATTERN = /^[\u3400-\u9fff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/u;

function sortKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const first = trimmed[0] ?? '';
  if (CJK_FIRST_CHAR_PATTERN.test(first)) {
    return pinyin(first, { toneType: 'none', pattern: 'first' }).toLowerCase();
  }
  return first.toLowerCase();
}

export function sortLocaleText(values: string[]): string[] {
  return [...values]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((left, right) => {
      const leftKey = sortKey(left);
      const rightKey = sortKey(right);
      if (leftKey !== rightKey) return leftKey.localeCompare(rightKey);
      return left.localeCompare(right, undefined, { sensitivity: 'base' });
    });
}

export function mergeUniqueSortedTextOptions(existing: string[], additions: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const item of sortLocaleText([...existing, ...additions])) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
