import { getAdminBrandOptions } from '@/server/admin/brands';
import { getAdminCategoryTree } from '@/server/admin/categories';
import { listAdminCoupons } from '@/server/admin/coupons';
import { getPromotionSettings } from '@/server/admin/promotion-settings';

import { parseCouponListQuery } from '@/lib/coupon-list-query';

import { CouponListClient } from '@/components/promotion/coupon-list-client';

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseCouponListQuery(params);

  const [settings, listResult, categoryTree, brandOptions] = await Promise.all([
    getPromotionSettings(),
    listAdminCoupons(query),
    getAdminCategoryTree(),
    getAdminBrandOptions(),
  ]);

  return (
    <CouponListClient
      initialSettings={settings}
      initialList={{
        items: listResult.items,
        total: listResult.total,
        page: listResult.page,
        pageSize: listResult.pageSize,
      }}
      initialQuery={query}
      categoryTree={categoryTree}
      brandOptions={brandOptions}
    />
  );
}
