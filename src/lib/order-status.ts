export const orderStatuses = [
  'unpaid',
  'pending_processing',
  'partially_shipped',
  'shipped',
  'completed',
  'cancelled',
  'terminated',
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const paymentStatuses = ['unpaid', 'paid'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const shippingStatuses = ['unshipped', 'shipped', 'delivered'] as const;
export type ShippingStatus = (typeof shippingStatuses)[number];

export const refundStatuses = ['none', 'pending', 'refunded', 'partially_refunded', 'refund_rejected'] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const refundTypes = ['full_refund', 'partial_refund', 'no_refund'] as const;
export type RefundType = (typeof refundTypes)[number];

export const returnTypes = ['return_goods', 'no_return'] as const;
export type ReturnType = (typeof returnTypes)[number];

export const orderActionTypes = [
  'status_change',
  'shipment_added',
  'refund_processed',
  'terminated',
  'note_updated',
  'completed',
] as const;

export type OrderActionType = (typeof orderActionTypes)[number];

export type OrderListView = 'pending' | 'processed' | 'refunds' | 'history';

export const orderProcessingStatuses: OrderStatus[] = [
  'pending_processing',
  'partially_shipped',
  'shipped',
  'completed',
];
