import { getAdminCategoryTree } from '@/server/admin/categories';
import { getAdminSiteLanguages } from '@/server/admin/languages';
import { getEnabledProductBoardOptions } from '@/server/admin/product-boards';
import { getAdminProductOptions, getAdminProductsPaginated } from '@/server/admin/products';

import { parseProductListQuery } from '@/lib/product-list-query';

import { AdminProductsClient } from './products-client';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseProductListQuery(params);

  const [listResult, options, categoryTree, activeLanguages, boardOptions] = await Promise.all([
    getAdminProductsPaginated(query),
    getAdminProductOptions(),
    getAdminCategoryTree(),
    getAdminSiteLanguages(),
    getEnabledProductBoardOptions(),
  ]);

  return (
    <AdminProductsClient
      initialList={{
        items: listResult.items,
        total: listResult.total,
        activeCount: listResult.activeCount,
        page: listResult.page,
        pageSize: listResult.pageSize,
      }}
      initialQuery={query}
      brandOptions={options.brands}
      boardOptions={boardOptions}
      categoryTree={categoryTree}
      activeLanguages={activeLanguages}
    />
  );
}
