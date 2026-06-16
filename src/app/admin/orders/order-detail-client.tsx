'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { formatAdminDate, formatAdminMoney, orderStatusLabels, orderStatusOptions } from '@/lib/admin-display';
import { parseOrderNote } from '@/lib/order-note';

type OrderItem = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  subtotal: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
  subtotal: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  customerNote: string | null;
  shippingAddressSnapshot: Record<string, string | null>;
  billingAddressSnapshot: Record<string, string | null>;
  placedAt: string | null;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
  customerLastName: string | null;
  items: OrderItem[];
};

export function OrderDetailClient({ initialOrder }: { initialOrder: OrderDetail }) {
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState(initialOrder.status);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/orders/${order.orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setMessage('订单状态更新失败。');
        return;
      }

      const nextOrder = (await response.json()) as OrderDetail;
      setOrder(nextOrder);
      setStatus(nextOrder.status);
      setMessage('订单状态已更新。');
    });
  }

  const shippingAddress = order.shippingAddressSnapshot;
  const billingAddress = order.billingAddressSnapshot;
  const customerIdentity = [`${order.customerName ?? ''} ${order.customerLastName ?? ''}`.trim() || null, order.customerEmail ?? null].filter(Boolean).join(' · ') || '游客订单';
  const parsedNote = parseOrderNote(order.customerNote);

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>订单 {order.orderNumber}</h1>
          <p style={{ margin: '8px 0 0', color: '#677489' }}>{customerIdentity}</p>
        </div>
        <Link href="/admin/orders">返回订单列表</Link>
      </div>
      <div className="info-grid">
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>业务摘要</h2>
          <p>订单状态：{orderStatusLabels[order.status]}</p>
          <p>支付方式：{order.paymentMethod ?? '未设置'}</p>
          <p>物流方式：{order.shippingMethod ?? '未设置'}</p>
          <p>下单时间：{order.placedAt ? formatAdminDate(order.placedAt) : '待确认'}</p>
          <p style={{ marginBottom: 0 }}>客户备注：{parsedNote.narrative ?? '无'}</p>
        </article>
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>金额汇总</h2>
          <p>商品小计：{formatAdminMoney(order.subtotal)}</p>
          <p>运费：{formatAdminMoney(order.shippingAmount)}</p>
          <p>税费：{formatAdminMoney(order.taxAmount)}</p>
          <p><strong>订单总额：{formatAdminMoney(order.totalAmount)}</strong></p>
        </article>
      </div>
      <div className="info-grid">
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>收货地址</h2>
          <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
          <p>{shippingAddress.addressLine1}</p>
          {shippingAddress.addressLine2 ? <p>{shippingAddress.addressLine2}</p> : null}
          <p>{shippingAddress.city} {shippingAddress.postalCode}</p>
          <p>{shippingAddress.countryCode}</p>
        </article>
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>账单地址</h2>
          <p>{billingAddress.firstName} {billingAddress.lastName}</p>
          <p>{billingAddress.addressLine1}</p>
          {billingAddress.addressLine2 ? <p>{billingAddress.addressLine2}</p> : null}
          <p>{billingAddress.city} {billingAddress.postalCode}</p>
          <p>{billingAddress.countryCode}</p>
        </article>
      </div>
      <article className="info-card">
        <h2 style={{ marginTop: 0 }}>订单商品</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <strong>{item.productName}</strong>
                <div style={{ color: '#677489' }}>{item.sku} · 数量 {item.quantity}</div>
              </div>
              <strong>{formatAdminMoney(item.subtotal)}</strong>
            </div>
          ))}
        </div>
      </article>

      {parsedNote.poNumber || parsedNote.taxId || parsedNote.requestedShipDate || parsedNote.tradeTerm ? (
        <div className="info-grid">
          {parsedNote.poNumber ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>PO 号</h2>
              <p style={{ marginBottom: 0 }}>{parsedNote.poNumber}</p>
            </article>
          ) : null}
          {parsedNote.taxId ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>税号 / VAT</h2>
              <p style={{ marginBottom: 0 }}>{parsedNote.taxId}</p>
            </article>
          ) : null}
          {parsedNote.requestedShipDate ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>要求发货日期</h2>
              <p style={{ marginBottom: 0 }}>{parsedNote.requestedShipDate}</p>
            </article>
          ) : null}
          {parsedNote.tradeTerm ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>贸易条款</h2>
              <p style={{ marginBottom: 0 }}>{parsedNote.tradeTerm}</p>
            </article>
          ) : null}
        </div>
      ) : null}

      <article className="info-card" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>流程更新</h2>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>订单状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as OrderDetail['status'])} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--color-border)', padding: '0 12px' }}>
            {orderStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="button-primary" disabled={isPending} onClick={save}>{isPending ? '保存中...' : '保存更新'}</button>
        </div>
        {message ? <p style={{ margin: 0, color: '#677489' }}>{message}</p> : null}
      </article>
    </main>
  );
}