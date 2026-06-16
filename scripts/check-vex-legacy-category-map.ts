import { readFile } from 'node:fs/promises';
import path from 'node:path';

type ProductSnapshot = { url: string };
type CategorySnapshot = { url: string; title?: string | null };

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

function categorySlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const withoutLeadId = segment.replace(/^\d+-/, '');
  const withoutTailId = withoutLeadId.replace(/-\d+$/, '');
  return normalizeSlug(withoutTailId);
}

async function loadJson<T>(inputDir: string, fileName: string): Promise<T> {
  const raw = await readFile(path.join(inputDir, fileName), 'utf8');
  return JSON.parse(raw) as T;
}

async function main() {
  const inputDir = path.resolve(process.cwd(), 'migration/vexmotor');
  const [productsSnapshot, categoriesSnapshot] = await Promise.all([
    loadJson<ProductSnapshot[]>(inputDir, 'products.json'),
    loadJson<CategorySnapshot[]>(inputDir, 'categories.json'),
  ]);

  const counts = new Map<string, { title: string; total: number }>();
  for (const item of categoriesSnapshot) {
    const slug = categorySlugFromPath(new URL(item.url).pathname);
    counts.set(slug, { title: item.title || slug, total: 0 });
  }

  for (const item of productsSnapshot) {
    const slug = categorySlugFromPath(new URL(item.url).pathname);
    const existing = counts.get(slug);
    if (existing) {
      existing.total += 1;
    }
  }

  console.log(JSON.stringify(Array.from(counts.entries()).map(([slug, value]) => ({ slug, title: value.title, total: value.total })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
