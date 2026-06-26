import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { formatAdminDate, formatAdminMoney, orderStatusColors, orderStatusLabels } from '@/lib/admin-display';
import { buildOrderDetailUrl, type OrderPendingListQuery } from '@/lib/order-list-query';
import type { AdminOrderListItem } from '@/server/admin/orders';

type OrderPendingCardProps = {
  order: AdminOrderListItem;
  listQuery?: OrderPendingListQuery;
};

export function OrderPendingCard({ order, listQuery }: OrderPendingCardProps) {
  const customerLine = [
    `${order.customerName ?? ''} ${order.customerLastName ?? ''}`.trim() || null,
    order.customerEmail ?? null,
  ]
    .filter(Boolean)
    .join(' · ') || '客户信息未填写';

  const href = buildOrderDetailUrl(order.orderNumber, 'pending', listQuery);
  const statusColor = orderStatusColors[order.status];

  return (
    <Link href={href} className="inquiry-active-card-link">
      <article className="info-card inquiry-active-card order-pending-card">
        <div className="inquiry-active-card__header">
          <h2 className="inquiry-active-card__title">{order.orderNumber}</h2>
          <span className="product-badge" data-color={statusColor}>
            {orderStatusLabels[order.status]}
          </span>
        </div>
        <p className="inquiry-active-card__meta">{customerLine}</p>
        <p className="inquiry-active-card__meta">
          {formatAdminMoney(order.totalAmount)} · {order.paymentMethod ?? '未设置支付'} · {order.shippingMethod ?? '未设置物流'}
        </p>
        <div className="inquiry-active-card__footer">
          <span className="inquiry-active-card__action">
            <span>查看详情</span>
            <RightOutlined />
          </span>
          <p className="inquiry-active-card__meta inquiry-active-card__meta--footer">
            下单时间：{formatAdminDate(order.placedAt ?? order.createdAt)}
          </p>
        </div>
      </article>
    </Link>
  );
}
