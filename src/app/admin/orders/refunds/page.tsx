import { listRefundAdminOrders } from '@/server/admin/orders';
import { parseOrderHistoryListQuery } from '@/lib/order-list-query';

import { OrderRefundListClient } from '@/components/orders/order-paginated-list-client';

export default async function AdminRefundOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = parseOrderHistoryListQuery(resolvedSearchParams);
  const list = await listRefundAdminOrders(query);

  return <OrderRefundListClient initialList={list} initialQuery={query} />;
}
