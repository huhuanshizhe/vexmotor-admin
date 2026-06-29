import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  type CrawlProduct,
  loadImportBrandId,
  loadImportCategoryIdBySlug,
  upsertCrawlProduct,
} from './lib/import-product-shared';

function parseArgs(argv: string[]) {
  const getArg = (name: string) => {
    const index = argv.indexOf(name);
    if (index >= 0 && argv[index + 1]) return argv[index + 1];
    return null;
  };

  return {
    file: getArg('--file'),
    spu: getArg('--spu'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file
    ? path.resolve(args.file)
    : path.resolve(process.cwd(), '../vexmotor/migration/vexmotor/import/single-product-crawl.json');

  const raw = await readFile(filePath, 'utf8');
  const product = JSON.parse(raw) as CrawlProduct;

  if (args.spu && product.spu !== args.spu) {
    console.warn(`警告: 文件 SPU=${product.spu} 与 --spu ${args.spu} 不一致，继续导入文件内容`);
  }

  const brandId = await loadImportBrandId();
  const categoryIdBySlug = await loadImportCategoryIdBySlug();
  const { result, productId } = await upsertCrawlProduct(product, brandId, categoryIdBySlug);

  console.log(`${result === 'created' ? '新建' : '更新'}成功: SPU ${product.spu} | ${product.name}`);
  console.log('productId:', productId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
