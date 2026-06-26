import { getAdminCategoryTree } from '@/server/admin/categories';
import { getAdminSiteLanguages } from '@/server/admin/languages';
import { listAdminCoupons } from '@/server/admin/coupons';

import { parseCouponListQuery } from '@/lib/coupon-list-query';

import { CouponListClient } from '@/components/promotion/coupon-list-client';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseCouponListQuery(params);

  const [listResult, categoryTree, activeLanguages] = await Promise.all([
    listAdminCoupons(query),
    getAdminCategoryTree(),
    getAdminSiteLanguages(),
  ]);

  return (
    <CouponListClient
      initialList={{
        items: listResult.items,
        total: listResult.total,
        page: listResult.page,
        pageSize: listResult.pageSize,
      }}
      initialQuery={query}
      categoryTree={categoryTree}
      activeLanguages={activeLanguages}
    />
  );
}
