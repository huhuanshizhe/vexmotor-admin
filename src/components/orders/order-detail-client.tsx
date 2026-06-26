'use client';

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';

import { OrderDetailBack } from '@/components/orders/order-detail-back';
import { OrderPartialRefundModal } from '@/components/orders/order-partial-refund-modal';
import { OrderShipmentModal } from '@/components/orders/order-shipment-modal';
import {
  formatAdminDate,
  formatAdminMoney,
  orderActionTypeLabels,
  orderEditableStatusOptions,
  orderStatusLabels,
  paymentStatusLabels,
  refundStatusLabels,
  refundTypeLabels,
  returnTypeLabels,
  shippingStatusLabels,
} from '@/lib/admin-display';
import { formatOrderCurrencyDisplay, formatOrderLocaleDisplay } from '@/lib/i18n';
import { parseOrderNote } from '@/lib/order-note';
import type {
  AdminOrderActionLog,
  AdminOrderCouponRedemption,
  AdminOrderDetail,
  AdminOrderItem,
  AdminOrderRefundRequest,
  AdminOrderShipment,
} from '@/server/admin/orders';
import type { OrderStatus } from '@/lib/order-status';

type SerializedOrderDetail = Omit<
  AdminOrderDetail,
  'placedAt' | 'createdAt' | 'terminatedAt' | 'shipments' | 'actionLogs' | 'refundRequest'
> & {
  placedAt: string | null;
  createdAt: string;
  terminatedAt: string | null;
  shipments: Array<
    Omit<AdminOrderShipment, 'shippedAt' | 'createdAt'> & {
      shippedAt: string;
      createdAt: string;
    }
  >;
  actionLogs: Array<
    Omit<AdminOrderActionLog, 'createdAt'> & {
      createdAt: string;
    }
  >;
  refundRequest:
    | (Omit<AdminOrderRefundRequest, 'processedAt' | 'createdAt'> & {
        processedAt: string | null;
        createdAt: string;
      })
    | null;
};

type OrderStatusFieldProps = {
  label: string;
  value: string;
  muted?: boolean;
};

function OrderStatusField({ label, value, muted }: OrderStatusFieldProps) {
  return (
    <div className="inquiry-status-card__item">
      <span className="inquiry-status-card__label">{label}</span>
      <span className={`inquiry-status-card__value${muted ? ' inquiry-status-card__value--muted' : ''}`}>{value}</span>
    </div>
  );
}

function displayDetailValue(value: string | null | undefined) {
  if (!value || value === '—') return '暂无';
  return value;
}

function DetailRow({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className="order-detail-dl__row">
      <dt className="order-detail-dl__label">{label}</dt>
      <dd className={`order-detail-dl__value${strong ? ' order-detail-dl__value--strong' : ''}${muted ? ' order-detail-dl__value--muted' : ''}`}>{value}</dd>
    </div>
  );
}

function formatAddressBlock(snapshot: Record<string, unknown>) {
  const get = (key: string) => {
    const value = snapshot[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };

  return {
    name: [get('firstName'), get('lastName')].filter(Boolean).join(' ') || '—',
    phone: get('phone'),
    company: get('company'),
    country: get('countryCode'),
    state: get('state'),
    city: get('city'),
    postalCode: get('postalCode'),
    line1: get('addressLine1'),
    line2: get('addressLine2'),
  };
}

function ShipmentItems({ items }: { items: SerializedOrderDetail['shipments'][number]['items'] }) {
  if (!items.length) return <span className="order-shipment-record__empty">暂无</span>;

  return (
    <ul className="order-shipment-record__item-list">
      {items.map((item) => (
        <li key={item.orderItemId} className="order-shipment-record__item-chip">
          <span className="order-shipment-record__item-name">{item.productName}</span>
          <span className="order-shipment-record__item-meta">
            {item.spu}
            {item.quantity ? ` × ${item.quantity}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ShipmentRecordCard({
  shipment,
  index,
}: {
  shipment: SerializedOrderDetail['shipments'][number];
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyTracking() {
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="order-shipment-record">
      <div className="order-shipment-record__mark" aria-hidden>
        <span>{index + 1}</span>
      </div>
      <div className="order-shipment-record__body">
        <div className="order-shipment-record__grid">
          <div className="order-shipment-record__field order-shipment-record__field--tracking">
            <span className="order-shipment-record__label">快递单号</span>
            <div className="order-shipment-record__tracking-row">
              <span className="order-shipment-record__tracking">{shipment.trackingNumber}</span>
              <button
                type="button"
                className="order-shipment-copy-btn"
                onClick={() => void handleCopyTracking()}
                aria-label="复制快递单号"
              >
                {copied ? (
                  <>
                    <CheckOutlined />
                    已复制
                  </>
                ) : (
                  <>
                    <CopyOutlined />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="order-shipment-record__field">
            <span className="order-shipment-record__label">发货时间</span>
            <span className="order-shipment-record__value">{formatAdminDate(shipment.shippedAt)}</span>
          </div>
          <div className="order-shipment-record__field">
            <span className="order-shipment-record__label">操作人</span>
            <span className={`order-shipment-record__value${!shipment.adminEmail ? ' order-shipment-record__empty' : ''}`}>
              {shipment.adminEmail ?? '暂无'}
            </span>
          </div>
          <div className="order-shipment-record__field">
            <span className="order-shipment-record__label">发货备注</span>
            <span className={`order-shipment-record__value${!shipment.note ? ' order-shipment-record__empty' : ''}`}>
              {shipment.note ?? '暂无'}
            </span>
          </div>
        </div>
        <div className="order-shipment-record__items">
          <span className="order-shipment-record__label">发货商品</span>
          <ShipmentItems items={shipment.items} />
        </div>
      </div>
    </article>
  );
}

function renderAddressCard(title: string, snapshot: Record<string, unknown>) {
  const address = formatAddressBlock(snapshot);

  return (
    <article className="info-card order-detail-compact-card">
      <h2>{title}</h2>
      <dl className="order-detail-dl">
        <DetailRow label="收货人" value={displayDetailValue(address.name)} />
        <DetailRow label="电话" value={displayDetailValue(address.phone)} />
        <DetailRow label="国家" value={displayDetailValue(address.country)} />
        <DetailRow label="省/州" value={displayDetailValue(address.state)} />
        <DetailRow label="城市" value={displayDetailValue(address.city)} />
        <DetailRow label="邮编" value={displayDetailValue(address.postalCode)} />
        <DetailRow label="地址行 1" value={displayDetailValue(address.line1)} />
        <DetailRow label="地址行 2" value={displayDetailValue(address.line2)} />
      </dl>
    </article>
  );
}

function formatActionLogSummary(
  log: SerializedOrderDetail['actionLogs'][number],
  currencyCode: string,
) {
  const label = orderActionTypeLabels[log.actionType] ?? log.actionType;
  const operator = log.adminEmail ?? '系统';
  const payload = log.payload ?? {};

  if (log.actionType === 'status_change' || log.actionType === 'completed') {
    const from = typeof payload.from === 'string' ? orderStatusLabels[payload.from as OrderStatus] ?? payload.from : null;
    const to = typeof payload.to === 'string' ? orderStatusLabels[payload.to as OrderStatus] ?? payload.to : null;
    if (from && to) return `${label}：${from} → ${to}（${operator}）`;
  }

  if (log.actionType === 'shipment_added' && typeof payload.trackingNumber === 'string') {
    return `${label}：${payload.trackingNumber}（${operator}）`;
  }

  if (log.actionType === 'refund_processed' && typeof payload.refundStatus === 'string') {
    const statusLabel = refundStatusLabels[payload.refundStatus as keyof typeof refundStatusLabels] ?? payload.refundStatus;
    const amount = typeof payload.refundedAmount === 'string' ? formatAdminMoney(payload.refundedAmount, currencyCode) : null;
    return amount
      ? `${label}：${statusLabel} ${amount}（${operator}）`
      : `${label}：${statusLabel}（${operator}）`;
  }

  if (log.actionType === 'terminated') {
    return `${label}（${operator}）`;
  }

  return `${label}（${operator}）`;
}

const shipmentRequiredStatuses: OrderStatus[] = ['partially_shipped', 'shipped'];

export function OrderDetailClient({
  initialOrder,
  backTarget,
}: {
  initialOrder: SerializedOrderDetail;
  backTarget: { href: string; label: string };
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState<OrderStatus>(initialOrder.status);
  const [internalNote, setInternalNote] = useState(initialOrder.internalNote ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [partialRefundModalOpen, setPartialRefundModalOpen] = useState(false);
  const [pendingStatusSave, setPendingStatusSave] = useState<OrderStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderCurrency = order.currencyCode || 'USD';
  const orderMoney = (amount: string | number | null | undefined) => formatAdminMoney(amount, orderCurrency);

  const parsedNote = parseOrderNote(order.customerNote);
  const shippingAddress = formatAddressBlock(order.shippingAddressSnapshot);
  const shippingPhone = shippingAddress.phone;
  const customerCompany = shippingAddress.company;
  const customerName = `${order.customerName ?? ''} ${order.customerLastName ?? ''}`.trim() || '—';

  const canTerminate = ['pending_processing', 'partially_shipped', 'shipped'].includes(order.status);
  const showRefundBlock = order.refundStatus === 'pending' && order.refundRequest;
  const canAddShipment = ['pending_processing', 'partially_shipped', 'shipped'].includes(order.status);
  const needsShipmentOnSave = shipmentRequiredStatuses.includes(status) && !order.hasShipments && status !== order.status;

  function applyOrderUpdate(nextOrder: SerializedOrderDetail) {
    setOrder(nextOrder);
    setStatus(nextOrder.status);
    setInternalNote(nextOrder.internalNote ?? '');
  }

  async function patchOrder(body: { status?: OrderStatus; internalNote?: string | null }) {
    const response = await fetch(`/api/admin/orders/${order.orderNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as SerializedOrderDetail;
  }

  async function postShipment(values: {
    trackingNumber: string;
    shippedAt: string;
    note?: string | null;
    items?: Array<{ orderItemId: string; quantity?: number | null }>;
  }) {
    const response = await fetch(`/api/admin/orders/${order.orderNumber}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) return null;
    return (await response.json()) as SerializedOrderDetail;
  }

  function executeSaveProcessing() {
    const statusChanged = status !== order.status;
    const noteChanged = internalNote !== (order.internalNote ?? '');

    startTransition(async () => {
      setMessage(null);

      if (!statusChanged && !noteChanged) {
        setMessage('没有需要保存的变更。');
        return;
      }

      const nextOrder = await patchOrder({
        ...(statusChanged ? { status } : {}),
        ...(noteChanged ? { internalNote } : {}),
      });
      if (!nextOrder) {
        setMessage('订单更新失败。');
        return;
      }
      applyOrderUpdate(nextOrder);
      setMessage('订单已更新。');
    });
  }

  function saveProcessing() {
    const statusChanged = status !== order.status;
    const noteChanged = internalNote !== (order.internalNote ?? '');

    if (!statusChanged && !noteChanged) {
      setMessage('没有需要保存的变更。');
      return;
    }

    if (statusChanged && needsShipmentOnSave) {
      setPendingStatusSave(status);
      setShipmentModalOpen(true);
      setMessage('请先填写发货信息，保存发货记录后将同步更新订单状态。');
      return;
    }

    Modal.confirm({
      title: '确定保存订单处理更新？',
      content: '确认保存当前订单状态与内部备注。',
      okText: '保存更新',
      cancelText: '取消',
      onOk: () => executeSaveProcessing(),
    });
  }

  function handleShipmentSubmit(values: {
    trackingNumber: string;
    shippedAt: string;
    note?: string | null;
    items?: Array<{ orderItemId: string; quantity?: number | null }>;
  }) {
    startTransition(async () => {
      setMessage(null);
      const afterShipment = await postShipment(values);
      if (!afterShipment) {
        setMessage('发货记录保存失败。');
        return;
      }

      let nextOrder = afterShipment;
      if (pendingStatusSave) {
        const patched = await patchOrder({ status: pendingStatusSave, internalNote: internalNote !== (order.internalNote ?? '') ? internalNote : undefined });
        nextOrder = patched ?? afterShipment;
        setPendingStatusSave(null);
      }

      applyOrderUpdate(nextOrder);
      setShipmentModalOpen(false);
      setMessage('发货记录已保存。');
    });
  }

  function terminateOrder() {
    Modal.confirm({
      title: '确定标记已终止？',
      content: '终止后订单将进入历史列表，且不可恢复为处理中状态。',
      okText: '确定终止',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        startTransition(async () => {
          setMessage(null);
          const response = await fetch(`/api/admin/orders/${order.orderNumber}/terminate`, { method: 'POST' });
          if (!response.ok) {
            setMessage('标记已终止失败。');
            return;
          }
          router.push(backTarget.href);
          router.refresh();
        });
      },
    });
  }

  function executeRefund(refundStatus: 'refunded' | 'partially_refunded' | 'refund_rejected', refundedAmount?: string) {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/orders/${order.orderNumber}/refund`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundStatus,
          ...(refundedAmount ? { refundedAmount } : {}),
        }),
      });
      if (!response.ok) {
        setMessage('退款处理失败。');
        return;
      }
      const nextOrder = (await response.json()) as SerializedOrderDetail;
      applyOrderUpdate(nextOrder);
      setPartialRefundModalOpen(false);
      setMessage('退款状态已更新。');
    });
  }

  function confirmFullRefund() {
    Modal.confirm({
      title: '确定标记为已退款？',
      content: `确认该订单已全额退款，实付金额 ${orderMoney(order.totalAmount)}。`,
      okText: '标记已退款',
      cancelText: '取消',
      onOk: () => executeRefund('refunded'),
    });
  }

  function confirmRejectRefund() {
    Modal.confirm({
      title: '确定拒绝退款？',
      content: '拒绝后该退款申请将被关闭，订单退款状态将标记为「拒绝退款」。',
      okText: '拒绝退款',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => executeRefund('refund_rejected'),
    });
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <OrderDetailBack href={backTarget.href} label={backTarget.label} />

      <div>
        <h1 style={{ margin: 0 }}>订单 {order.orderNumber}</h1>
      </div>

      <div className="order-detail-header-grid">
        <article className="info-card order-detail-compact-card">
          <h2>订单摘要</h2>
          <dl className="order-detail-dl">
            <DetailRow label="支付方式" value={order.paymentMethod ?? '未设置'} />
            <DetailRow label="物流方式" value={order.shippingMethod ?? '未设置'} />
            <DetailRow label="下单时间" value={order.placedAt ? formatAdminDate(order.placedAt) : '待确认'} />
            <DetailRow label="下单语言" value={formatOrderLocaleDisplay(order.locale)} />
            <DetailRow label="下单币种" value={formatOrderCurrencyDisplay(order.currencyCode)} />
            <DetailRow label="客户备注" value={parsedNote.narrative ?? '暂无'} muted={!parsedNote.narrative} />
          </dl>
          <hr className="order-detail-amount-divider" />
          <dl className="order-detail-dl">
            <DetailRow label="订单总金额" value={orderMoney(order.subtotal)} />
            <DetailRow label="订单总优惠金额" value={orderMoney(order.discountAmount)} />
            <DetailRow label="订单物流总金额" value={orderMoney(order.shippingAmount)} />
            <DetailRow label="订单税费总金额" value={orderMoney(order.taxAmount)} />
            {order.couponRedemptions.length ? (
              <div className="order-detail-dl__row">
                <dt className="order-detail-dl__label">优惠明细</dt>
                <dd className="order-detail-dl__value">
                  <div className="order-detail-dl__stack">
                    {order.couponRedemptions.map((coupon: AdminOrderCouponRedemption) => (
                      <div key={coupon.id} className="order-detail-coupon-line">
                        {coupon.couponName ?? coupon.couponCode}
                        {' · '}
                        {coupon.scopeSummary ?? '优惠券'}
                        {' · '}
                        -{orderMoney(coupon.discountAmount)}
                      </div>
                    ))}
                  </div>
                </dd>
              </div>
            ) : null}
            <DetailRow label="订单实付总金额" value={orderMoney(order.totalAmount)} strong />
          </dl>
        </article>

        <article className="info-card order-detail-compact-card">
          <h2>客户信息</h2>
          <dl className="order-detail-dl">
            <DetailRow label="姓名" value={customerName === '—' ? '暂无' : customerName} />
            <DetailRow label="邮箱" value={displayDetailValue(order.customerEmail)} />
            <DetailRow label="电话" value={displayDetailValue(shippingPhone)} />
          </dl>
          <hr className="order-detail-amount-divider" />
          <dl className="order-detail-dl">
            <DetailRow label="公司信息" value={displayDetailValue(customerCompany)} muted={!customerCompany} />
          </dl>
        </article>
      </div>

      <div className="order-detail-header-grid">
        {renderAddressCard('收货地址', order.shippingAddressSnapshot)}
        {renderAddressCard('账单地址', order.billingAddressSnapshot)}
      </div>

      <article className="info-card">
        <h2 style={{ marginTop: 0 }}>订单商品</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {order.items.map((item: AdminOrderItem) => (
            <div key={item.id} className="order-item-row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{item.productName}</strong>
                <div style={{ color: '#677489' }}>
                  {item.spu}
                  {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                </div>
                {item.featureSelections?.length ? (
                  <ul style={{ color: '#677489', margin: '6px 0 0', paddingLeft: 18 }}>
                    {item.featureSelections.map((selection) => (
                      <li key={`${item.id}-${selection.valueId}`}>
                        {selection.definitionName}: {selection.display}
                        {selection.unit ? ` ${selection.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div style={{ color: '#677489', marginTop: 4 }}>
                  {orderMoney(item.unitPrice)} × {item.quantity}
                </div>
              </div>
              <strong>{orderMoney(item.subtotal)}</strong>
            </div>
          ))}
        </div>
      </article>

      {(parsedNote.poNumber || parsedNote.taxId || parsedNote.requestedShipDate) ? (
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
        </div>
      ) : null}

      <article className="info-card inquiry-status-card order-status-card">
        <div className="inquiry-status-card__header">
          <h2>处理状态</h2>
          {canTerminate && !order.terminatedAt ? (
            <button type="button" className="button-outline-danger" disabled={isPending} onClick={terminateOrder}>
              标记已终止
            </button>
          ) : null}
        </div>
        <div className="inquiry-status-card__grid">
          <OrderStatusField label="订单状态" value={orderStatusLabels[order.status]} />
          <OrderStatusField label="付款状态" value={paymentStatusLabels[order.paymentStatus]} />
          <OrderStatusField label="发货状态" value={shippingStatusLabels[order.shippingStatus]} />
          <OrderStatusField label="退款状态" value={refundStatusLabels[order.refundStatus]} />
          <OrderStatusField label="下单时间" value={formatAdminDate(order.placedAt ?? order.createdAt)} />
          <OrderStatusField
            label="终止时间"
            value={order.terminatedAt ? formatAdminDate(order.terminatedAt) : '—'}
            muted={!order.terminatedAt}
          />
          <OrderStatusField
            label="终止操作人"
            value={order.terminatedByEmail ?? '—'}
            muted={!order.terminatedByEmail}
          />
        </div>
      </article>

      <article className="info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>发货记录</h2>
          {canAddShipment ? (
            <button type="button" className="button-outline" disabled={isPending} onClick={() => setShipmentModalOpen(true)}>
              添加更多发货记录
            </button>
          ) : null}
        </div>
        {!order.shipments.length ? (
          <p style={{ marginBottom: 0, color: '#677489' }}>暂无发货记录</p>
        ) : (
          <div className="order-shipment-records">
            {order.shipments.map((shipment, index) => (
              <ShipmentRecordCard key={shipment.id} shipment={shipment} index={index} />
            ))}
          </div>
        )}
      </article>

      {showRefundBlock && order.refundRequest ? (
        <article className="info-card" style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0 }}>退款处理</h2>
          <p>退款类型：{refundTypeLabels[order.refundRequest.refundType]}</p>
          <p>退货类型：{returnTypeLabels[order.refundRequest.returnType]}</p>
          <p>申请原因：{order.refundRequest.reason ?? '—'}</p>
          <p>申请金额：{order.refundRequest.requestedAmount ? orderMoney(order.refundRequest.requestedAmount) : '—'}</p>
          <div className="order-refund-actions">
            <button type="button" className="button-primary order-refund-actions__primary" disabled={isPending} onClick={confirmFullRefund}>
              标记已退款
            </button>
            <button type="button" className="button-primary order-refund-actions__primary" disabled={isPending} onClick={() => setPartialRefundModalOpen(true)}>
              标记已部分退款
            </button>
            <button type="button" className="button-outline-danger order-refund-actions__danger" disabled={isPending} onClick={confirmRejectRefund}>
              拒绝退款
            </button>
          </div>
        </article>
      ) : null}

      <article className="info-card" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>订单处理</h2>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>订单状态</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus)}
            disabled={['cancelled', 'terminated', 'unpaid'].includes(order.status)}
            style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--color-border)', padding: '0 12px' }}
          >
            {orderEditableStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span>内部备注</span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            rows={3}
            style={{ borderRadius: 12, border: '1px solid var(--color-border)', padding: 12, resize: 'vertical' }}
          />
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="button-primary" disabled={isPending} onClick={saveProcessing}>
            {isPending ? '保存中...' : '保存更新'}
          </button>
        </div>
        {message ? <p style={{ margin: 0, color: '#677489' }}>{message}</p> : null}
      </article>

      <article className="info-card">
        <h2 style={{ marginTop: 0 }}>订单处理历史</h2>
        {!order.actionLogs.length ? (
          <p style={{ marginBottom: 0, color: '#677489' }}>暂无处理记录</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            {order.actionLogs.map((log) => (
              <li key={log.id}>
                <span>{formatAdminDate(log.createdAt)}</span>
                {' · '}
                <span>{formatActionLogSummary(log, orderCurrency)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <OrderShipmentModal
        open={shipmentModalOpen}
        orderItems={order.items}
        loading={isPending}
        onCancel={() => {
          setShipmentModalOpen(false);
          setPendingStatusSave(null);
        }}
        onSubmit={handleShipmentSubmit}
      />

      <OrderPartialRefundModal
        open={partialRefundModalOpen}
        totalAmount={order.totalAmount}
        currencyCode={orderCurrency}
        loading={isPending}
        onCancel={() => setPartialRefundModalOpen(false)}
        onSubmit={(refundedAmount) => executeRefund('partially_refunded', refundedAmount)}
      />
    </main>
  );
}
