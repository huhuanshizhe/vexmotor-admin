export const purchaseModeLabels = {
  buy: '直接下单',
  inquiry: '询价模式',
} as const;

export const productStatusLabels = {
  active: '上架',
  inactive: '下架',
} as const;

export const productLifecycleLabels = {
  new: '新品 (New)',
  active: '在售 (Active)',
  nfd: '停售通知 (NFD)',
  eol: '停产 (EOL)',
  last_time_buy: '最后采购 (Last Time Buy)',
} as const;

/** 列表页展示：纯中文，无括号英文 */
export const productLifecycleListLabels = {
  new: '新品',
  active: '在售',
  nfd: '停售通知',
  eol: '停产',
  last_time_buy: '最后采购',
} as const;

export const categoryStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export const brandStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export type { OrderStatus, PaymentStatus, ShippingStatus, RefundStatus, RefundType, ReturnType, OrderListView } from '@/lib/order-status';
export {
  orderStatuses,
  paymentStatuses,
  shippingStatuses,
  refundStatuses,
  refundTypes,
  returnTypes,
} from '@/lib/order-status';

export const orderStatusLabels = {
  unpaid: '未付款',
  pending_processing: '待处理',
  partially_shipped: '部分发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  terminated: '已终止',
} as const;

export const paymentStatusLabels = {
  unpaid: '未付款',
  paid: '已付款',
} as const;

export const shippingStatusLabels = {
  unshipped: '未发货',
  shipped: '已发货',
  delivered: '已签收',
} as const;

export const refundStatusLabels = {
  none: '无退款',
  pending: '未退款',
  refunded: '已退款',
  partially_refunded: '已部分退款',
  refund_rejected: '拒绝退款',
} as const;

export const refundTypeLabels = {
  full_refund: '退款',
  partial_refund: '部分退款',
  no_refund: '不退款',
} as const;

export const returnTypeLabels = {
  return_goods: '退货',
  no_return: '不退货',
} as const;

export const inquiryStatusLabels = {
  new: '新询盘',
  contacted: '已联系',
  quoted: '已报价',
  closed: '已关闭',
} as const;

export const inquiryQueueKindLabels = {
  new_inquiry: '新询盘',
  customer_replied: '新回复',
} as const;

export const inquiryResolutionLabels = {
  resolved: '已解决',
  terminated: '已终止',
  replied: '已回复',
} as const;

export const userRoleLabels = {
  customer: '客户',
  staff: '员工',
  admin: '管理员',
} as const;

export const userStatusLabels = {
  active: '正常',
  disabled: '禁用',
  pending: '待审核',
} as const;

export const contentStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export const cmsStatusLabels = {
  draft: '草稿',
  published: '已发布',
  archived: '归档',
} as const;

export const purchaseModeOptions = Object.entries(purchaseModeLabels).map(([value, label]) => ({ value, label }));
export const productStatusOptions = Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }));
export const productLifecycleOptions = Object.entries(productLifecycleLabels).map(([value, label]) => ({ value, label }));
export const productLifecycleListOptions = Object.entries(productLifecycleListLabels).map(([value, label]) => ({ value, label }));
export const categoryStatusOptions = Object.entries(categoryStatusLabels).map(([value, label]) => ({ value, label }));
export const brandStatusOptions = Object.entries(brandStatusLabels).map(([value, label]) => ({ value, label }));
export const orderStatusOptions = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }));

export const orderEditableStatusOptions = (
  ['pending_processing', 'partially_shipped', 'shipped', 'completed'] as const
).map((value) => ({ value, label: orderStatusLabels[value] }));

export const orderActionTypeLabels = {
  status_change: '状态变更',
  shipment_added: '添加发货记录',
  refund_processed: '退款处理',
  terminated: '标记已终止',
  note_updated: '更新内部备注',
  completed: '标记已完成',
} as const;
export const inquiryStatusOptions = Object.entries(inquiryStatusLabels).map(([value, label]) => ({ value, label }));

/** 销售跟进下拉：不含「已关闭」，终止操作使用「标记已终止」 */
export const inquiryFollowUpStatusOptions = inquiryStatusOptions.filter((option) => option.value !== 'closed');
export const inquiryQueueKindOptions = Object.entries(inquiryQueueKindLabels).map(([value, label]) => ({ value, label }));
export const inquiryResolutionOptions = Object.entries(inquiryResolutionLabels).map(([value, label]) => ({ value, label }));

export const couponStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export const couponScopeLabels = {
  all: '全场通用',
  category: '指定分类',
  brand: '指定品牌',
  product: '指定商品',
} as const;

export const couponDiscountTypeLabels = {
  direct_amount: '直减',
  percent: '折扣',
  fixed_amount: '满减',
  special_price: '特价',
} as const;

export const couponGrantSourceLabels = {
  admin_send: '管理员发放',
  registration: '注册赠送',
  self_claim: '用户领取',
} as const;

export const couponDistributionTargetModeLabels = {
  all_customers: '全站客户',
  selected_customers: '指定客户',
} as const;

export const couponStatusOptions = Object.entries(couponStatusLabels).map(([value, label]) => ({ value, label }));
export const couponScopeOptions = Object.entries(couponScopeLabels).map(([value, label]) => ({ value, label }));
export const couponDiscountTypeOptions = [
  { value: 'direct_amount', label: couponDiscountTypeLabels.direct_amount },
  { value: 'percent', label: couponDiscountTypeLabels.percent },
  { value: 'fixed_amount', label: couponDiscountTypeLabels.fixed_amount },
  { value: 'special_price', label: couponDiscountTypeLabels.special_price },
] as const;
export const couponGrantSourceOptions = Object.entries(couponGrantSourceLabels).map(([value, label]) => ({ value, label }));

export const couponStatusColors = {
  active: 'green',
  inactive: 'default',
} as const;

export const couponScopeColors = {
  all: 'blue',
  category: 'purple',
  brand: 'cyan',
  product: 'orange',
} as const;

export const couponDiscountTypeColors = {
  direct_amount: 'volcano',
  percent: 'gold',
  fixed_amount: 'red',
  special_price: 'magenta',
} as const;

export function formatCouponDiscountSummary(input: {
  discountType: keyof typeof couponDiscountTypeLabels;
  discountValue: string | number;
  defaultCurrencyCode?: string;
}) {
  const value = Number(input.discountValue);
  if (input.discountType === 'percent') return `${value}%`;
  const currency = input.defaultCurrencyCode ?? 'USD';
  return formatAdminMoney(value, currency);
}

export const userRoleOptions = Object.entries(userRoleLabels).map(([value, label]) => ({ value, label }));
export const userStatusOptions = Object.entries(userStatusLabels).map(([value, label]) => ({ value, label }));
export const contentStatusOptions = Object.entries(contentStatusLabels).map(([value, label]) => ({ value, label }));
export const cmsStatusOptions = Object.entries(cmsStatusLabels).map(([value, label]) => ({ value, label }));

export const purchaseModeColors = {
  buy: 'green',
  inquiry: 'orange',
} as const;

export const productStatusColors = {
  active: 'green',
  inactive: 'default',
} as const;

export const productLifecycleColors = {
  new: 'blue',
  active: 'green',
  nfd: 'orange',
  eol: 'red',
  last_time_buy: 'purple',
} as const;

export const categoryStatusColors = {
  active: 'green',
  inactive: 'orange',
} as const;

export const brandStatusColors = {
  active: 'green',
  inactive: 'orange',
} as const;

export const orderStatusColors = {
  unpaid: 'gold',
  pending_processing: 'blue',
  partially_shipped: 'cyan',
  shipped: 'purple',
  completed: 'green',
  cancelled: 'red',
  terminated: 'volcano',
} as const;

export const paymentStatusColors = {
  unpaid: 'gold',
  paid: 'green',
} as const;

export const shippingStatusColors = {
  unshipped: 'default',
  shipped: 'blue',
  delivered: 'green',
} as const;

export const refundStatusColors = {
  none: 'default',
  pending: 'orange',
  refunded: 'red',
  partially_refunded: 'volcano',
  refund_rejected: 'default',
} as const;

export const inquiryStatusColors = {
  new: 'gold',
  contacted: 'blue',
  quoted: 'purple',
  closed: 'green',
} as const;

export const inquiryQueueKindColors = {
  new_inquiry: 'gold',
  customer_replied: 'orange',
} as const;

export const inquiryResolutionColors = {
  resolved: 'green',
  terminated: 'red',
  replied: 'blue',
} as const;

export const userRoleColors = {
  customer: 'default',
  staff: 'blue',
  admin: 'red',
} as const;

export const userStatusColors = {
  active: 'green',
  disabled: 'red',
  pending: 'gold',
} as const;

export const contentStatusColors = {
  active: 'green',
  inactive: 'orange',
} as const;

export const cmsStatusColors = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
} as const;

export function getInquiryResolutionLabel(input: {
  resolvedAt: Date | string | null;
  terminatedAt: Date | string | null;
  status: keyof typeof inquiryStatusLabels;
}) {
  if (input.terminatedAt) return inquiryResolutionLabels.terminated;
  if (input.resolvedAt) return inquiryResolutionLabels.resolved;
  if (input.status !== 'new') return inquiryResolutionLabels.replied;
  return '—';
}

export function formatAdminMoney(amount: string | number | null | undefined, currencyCode = 'USD') {
  const numericAmount = Number(amount ?? 0);
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

export function formatAdminDate(value: string | Date | null | undefined) {
  if (!value) {
    return '未记录';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function formatAdminAddress(row: {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  countryCode: string;
  company?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}) {
  const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  const lines = [
    name || null,
    row.company,
    row.addressLine1,
    row.addressLine2,
    [row.city, row.state, row.postalCode].filter(Boolean).join(', '),
    row.countryCode,
    row.phone,
  ].filter((line) => Boolean(line && String(line).trim()));

  return lines.join('\n');
}

export function formatAdminSnapshotAddress(snapshot: Record<string, unknown>) {
  const read = (key: string) => {
    const value = snapshot[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };

  return formatAdminAddress({
    firstName: read('firstName') ?? read('first_name') ?? undefined,
    lastName: read('lastName') ?? read('last_name') ?? undefined,
    company: read('company'),
    phone: read('phone'),
    addressLine1: read('addressLine1') ?? read('address_line_1') ?? read('addressLine1') ?? '—',
    addressLine2: read('addressLine2') ?? read('address_line_2'),
    city: read('city') ?? '—',
    state: read('state'),
    postalCode: read('postalCode') ?? read('postal_code'),
    countryCode: read('countryCode') ?? read('country_code') ?? '—',
  });
}
