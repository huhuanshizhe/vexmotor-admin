import { Suspense } from 'react';

import { AdminProductFeaturesClient } from './product-features-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { getAdminFeatureDefinitionsPaginated } from '@/server/admin/feature-definitions';
import { getAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ProductFeaturesPageContent({ searchParams }: PageProps) {
  const [siteLanguages, params] = await Promise.all([
    getAdminSiteLanguages(),
    searchParams,
  ]);

  const initialQuery = parseAdminListQuery(params);
  const initialList = await getAdminFeatureDefinitionsPaginated({
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
  });

  const activeLanguages = siteLanguages.filter((language) => language.status === 'active');

  return (
    <AdminProductFeaturesClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
    />
  );
}

export default function AdminProductFeaturesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <ProductFeaturesPageContent searchParams={searchParams} />
    </Suspense>
  );
}
