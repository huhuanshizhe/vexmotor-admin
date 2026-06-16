import Link from 'next/link';

import { formatAdminDate, formatAdminMoney, orderStatusLabels } from '@/lib/admin-display';
import { getAdminOrders } from '@/server/admin/orders';

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0 }}>订单管理</h1>
        <p style={{ margin: '8px 0 0', color: '#677489' }}>查看前台下单产生的真实订单，跟进付款、履约与交付状态。</p>
      </div>
      {!orders.length ? (
        <article className="info-card">
          <h2>暂无订单</h2>
          <p className="section-description">客户完成结算后，订单将自动出现在这里，便于销售与运营团队处理。</p>
        </article>
      ) : (
        <div className="info-grid">
          {orders.map((order) => (
            <article key={order.id} className="info-card" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{order.orderNumber}</h2>
                <span className="product-badge">{orderStatusLabels[order.status]}</span>
              </div>
              <p style={{ margin: 0, color: '#677489' }}>
                {[`${order.customerName ?? ''} ${order.customerLastName ?? ''}`.trim() || null, order.customerEmail ?? null].filter(Boolean).join(' · ') || '游客下单'}
              </p>
              <p style={{ margin: 0, color: '#677489' }}>支付方式：{order.paymentMethod ?? '未设置'} · 物流方式：{order.shippingMethod ?? '未设置'}</p>
              <p style={{ margin: 0, color: '#677489' }}>创建时间：{formatAdminDate(order.createdAt)}</p>
              <p style={{ margin: 0 }}><strong>{formatAdminMoney(order.totalAmount)}</strong></p>
              <Link href={`/admin/orders/${order.orderNumber}`}>查看订单详情</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
