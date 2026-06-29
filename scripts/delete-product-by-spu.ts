import '@/lib/env';

import { deleteProductBySpu } from './lib/import-product-shared';

async function main() {
  const spu = process.argv[2] ?? process.argv[process.argv.indexOf('--spu') + 1];
  if (!spu) {
    throw new Error('Usage: tsx scripts/delete-product-by-spu.ts <spu>');
  }

  const deletedId = await deleteProductBySpu(spu.trim());
  if (!deletedId) {
    console.log(`未找到 SPU=${spu}`);
    return;
  }

  console.log(`已删除 SPU=${spu}, productId=${deletedId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
