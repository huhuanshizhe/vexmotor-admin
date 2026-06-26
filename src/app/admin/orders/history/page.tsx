import { listHistoryAdminOrders } from '@/server/admin/orders';
import { parseOrderHistoryListQuery } from '@/lib/order-list-query';

import { OrderHistoryListClient } from '@/components/orders/order-paginated-list-client';

export default async function AdminHistoryOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = parseOrderHistoryListQuery(resolvedSearchParams);
  const list = await listHistoryAdminOrders(query);

  return <OrderHistoryListClient initialList={list} initialQuery={query} />;
}
