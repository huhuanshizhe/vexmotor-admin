import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminOrderDetail } from '@/server/admin/orders';
import { OrderDetailClient } from '../order-detail-client';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getAdminOrderDetail(orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <OrderDetailClient
      initialOrder={{
        ...order,
        shippingAddressSnapshot: order.shippingAddressSnapshot as Record<string, string | null>,
        billingAddressSnapshot: order.billingAddressSnapshot as Record<string, string | null>,
        placedAt: order.placedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
      }}
    />
  );
}
