import { CategoriesClient } from './categories-client';
import { ROOT_CATEGORY_PARENT_KEY } from '@/lib/category-content';
import { parseAdminListQuery } from '@/lib/admin-list-query';
import { getAdminCategoriesPaginated, getAdminCategoryStats, getAdminCategoryTreeLevel } from '@/server/admin/categories';
import { getAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialQuery = parseAdminListQuery(params);
  const parentId = initialQuery.parentId || ROOT_CATEGORY_PARENT_KEY;

  const [initialList, initialTree, initialStats, activeLanguages] = await Promise.all([
    getAdminCategoriesPaginated({
      parentId: parentId === ROOT_CATEGORY_PARENT_KEY ? null : parentId,
      keyword: initialQuery.keyword || undefined,
      page: initialQuery.page,
      pageSize: initialQuery.pageSize,
    }),
    getAdminCategoryTreeLevel(null),
    getAdminCategoryStats(),
    getAdminSiteLanguages(),
  ]);

  return (
    <CategoriesClient
      initialList={{
        items: initialList.items,
        total: initialList.total,
        page: initialList.page,
        pageSize: initialList.pageSize,
      }}
      initialQuery={{
        ...initialQuery,
        parentId,
        board: '',
      }}
      initialTree={initialTree}
      initialStats={initialStats}
      activeLanguages={activeLanguages}
    />
  );
}
