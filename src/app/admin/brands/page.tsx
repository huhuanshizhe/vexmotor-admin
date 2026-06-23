import { Suspense } from 'react';

import { AdminBrandsClient } from './brands-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { getAdminBrandsPaginated } from '@/server/admin/brands';
import { getAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function BrandsPageContent({ searchParams }: PageProps) {
  const [siteLanguages, params] = await Promise.all([
    getAdminSiteLanguages(),
    searchParams,
  ]);

  const initialQuery = parseAdminListQuery(params);
  const initialList = await getAdminBrandsPaginated({
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
  });

  const activeLanguages = siteLanguages.filter((language) => language.status === 'active');

  return (
    <AdminBrandsClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
    />
  );
}

export default function AdminBrandsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <BrandsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
