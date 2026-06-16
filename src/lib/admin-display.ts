export const purchaseModeLabels = {
  buy: '直接下单',
  inquiry: '询价模式',
} as const;

export const productStatusLabels = {
  draft: '草稿',
  active: '上架',
  inactive: '停用',
  archived: '归档',
} as const;

export const categoryStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export const brandStatusLabels = {
  active: '启用',
  inactive: '停用',
} as const;

export const orderStatusLabels = {
  pending: '待处理',
  paid: '已付款',
  processing: '处理中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
} as const;

export const inquiryStatusLabels = {
  new: '新询盘',
  contacted: '已联系',
  quoted: '已报价',
  closed: '已关闭',
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
export const categoryStatusOptions = Object.entries(categoryStatusLabels).map(([value, label]) => ({ value, label }));
export const brandStatusOptions = Object.entries(brandStatusLabels).map(([value, label]) => ({ value, label }));
export const orderStatusOptions = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }));
export const inquiryStatusOptions = Object.entries(inquiryStatusLabels).map(([value, label]) => ({ value, label }));
export const userRoleOptions = Object.entries(userRoleLabels).map(([value, label]) => ({ value, label }));
export const userStatusOptions = Object.entries(userStatusLabels).map(([value, label]) => ({ value, label }));
export const contentStatusOptions = Object.entries(contentStatusLabels).map(([value, label]) => ({ value, label }));
export const cmsStatusOptions = Object.entries(cmsStatusLabels).map(([value, label]) => ({ value, label }));

export const purchaseModeColors = {
  buy: 'green',
  inquiry: 'orange',
} as const;

export const productStatusColors = {
  draft: 'default',
  active: 'green',
  inactive: 'orange',
  archived: 'red',
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
  pending: 'gold',
  paid: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  completed: 'green',
  cancelled: 'red',
  refunded: 'volcano',
} as const;

export const inquiryStatusColors = {
  new: 'gold',
  contacted: 'blue',
  quoted: 'purple',
  closed: 'green',
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
