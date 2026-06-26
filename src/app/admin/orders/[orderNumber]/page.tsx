import { notFound } from 'next/navigation';

import { OrderDetailClient } from '@/components/orders/order-detail-client';
import { resolveOrderDetailBack } from '@/lib/order-list-query';
import { getAdminOrderDetail } from '@/server/admin/orders';

function serializeOrder(order: NonNullable<Awaited<ReturnType<typeof getAdminOrderDetail>>>) {
  return {
    ...order,
    placedAt: order.placedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    terminatedAt: order.terminatedAt?.toISOString() ?? null,
    shipments: order.shipments.map((shipment) => ({
      ...shipment,
      shippedAt: shipment.shippedAt.toISOString(),
      createdAt: shipment.createdAt.toISOString(),
    })),
    actionLogs: order.actionLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    refundRequest: order.refundRequest
      ? {
          ...order.refundRequest,
          processedAt: order.refundRequest.processedAt?.toISOString() ?? null,
          createdAt: order.refundRequest.createdAt.toISOString(),
        }
      : null,
  };
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderNumber } = await params;
  const resolvedSearchParams = await searchParams;
  const order = await getAdminOrderDetail(orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <OrderDetailClient
      initialOrder={serializeOrder(order)}
      backTarget={resolveOrderDetailBack(resolvedSearchParams)}
    />
  );
}
