import assert from 'node:assert/strict';

import {
  generateSlugFromText,
  normalizeSlug,
  resolveSlugForSave,
  transliterateSlugSource,
} from '../src/lib/slug';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
}

test('normalizeSlug collapses whitespace and lowercases', () => {
  assert.equal(normalizeSlug('  Power   Supply  '), 'power-supply');
});

test('generateSlugFromText handles english', () => {
  assert.equal(generateSlugFromText('Power Supply'), 'power-supply');
});

test('generateSlugFromText handles chinese', () => {
  const slug = generateSlugFromText('步进电机');
  assert.match(slug, /^[a-z0-9-]+$/);
  assert.ok(slug.includes('bu'));
  assert.ok(slug.includes('jin'));
});

test('generateSlugFromText handles mixed text', () => {
  const slug = generateSlugFromText('Nema 34 步进电机');
  assert.equal(slug.startsWith('nema-34-'), true);
  assert.match(slug, /^[a-z0-9-]+$/);
});

test('transliterateSlugSource keeps english segments', () => {
  assert.match(transliterateSlugSource('Nema 34'), /Nema/i);
});

test('resolveSlugForSave prefers manual slug', () => {
  assert.equal(resolveSlugForSave({ sourceText: '步进电机', slug: 'Custom-Slug' }), 'custom-slug');
});

test('resolveSlugForSave generates from source when slug empty', () => {
  const slug = resolveSlugForSave({ sourceText: 'Power Supply', slug: '' });
  assert.equal(slug, 'power-supply');
});

test('resolveSlugForSave returns null when both empty', () => {
  assert.equal(resolveSlugForSave({ sourceText: '', slug: '' }), null);
});

console.log('All slug tests passed.');
