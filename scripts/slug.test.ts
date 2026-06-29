import assert from 'node:assert/strict';

import {
  generateSlugFromText,
  normalizeSlug,
  resolveSlugForSave,
  textToSlug,
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

test('textToSlug is an alias of generateSlugFromText', () => {
  assert.equal(textToSlug('Power Supply'), generateSlugFromText('Power Supply'));
});

test('validateSourceThenAutoSlug auto-fills from title', () => {
  // imported via dynamic require to keep test file simple
  const { validateSourceThenAutoSlug } = require('../src/lib/slug') as typeof import('../src/lib/slug');
  const result = validateSourceThenAutoSlug({
    locale: 'de',
    sourceText: 'Schrittmotor',
    slug: '',
    emptySourceMessage: '请输入标题',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.autoSlug);
    assert.match(result.autoSlug, /^[a-z0-9-]+$/);
  }
});

console.log('All slug tests passed.');
