import { listPendingAdminOrders } from '@/server/admin/orders';
import { parseOrderPendingListQuery } from '@/lib/order-list-query';

import { OrderPendingListClient } from '@/components/orders/order-pending-list-client';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = parseOrderPendingListQuery(resolvedSearchParams);
  const items = await listPendingAdminOrders(query);

  return <OrderPendingListClient initialItems={items} initialQuery={query} />;
}
