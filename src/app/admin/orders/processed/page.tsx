import { listProcessedAdminOrders } from '@/server/admin/orders';
import { parseOrderHistoryListQuery } from '@/lib/order-list-query';

import { OrderProcessedListClient } from '@/components/orders/order-paginated-list-client';

export default async function AdminProcessedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = parseOrderHistoryListQuery(resolvedSearchParams);
  const list = await listProcessedAdminOrders(query);

  return <OrderProcessedListClient initialList={list} initialQuery={query} />;
}
