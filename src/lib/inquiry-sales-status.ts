export const INQUIRY_SALES_STATUS_OPTIONS = [
  { value: 'unset', label: '未标记' },
  { value: 'following', label: '跟进中' },
  { value: 'negotiating', label: '议价中' },
  { value: 'won', label: '已成交' },
  { value: 'lost', label: '已流失' },
] as const;

export type InquirySalesStatus = (typeof INQUIRY_SALES_STATUS_OPTIONS)[number]['value'];

const labelByValue = Object.fromEntries(
  INQUIRY_SALES_STATUS_OPTIONS.map((item) => [item.value, item.label]),
) as Record<InquirySalesStatus, string>;

export function formatInquirySalesStatus(value: string | null | undefined) {
  if (!value || !(value in labelByValue)) {
    return '未标记';
  }
  return labelByValue[value as InquirySalesStatus];
}

export const inquirySalesStatusFilterOptions = INQUIRY_SALES_STATUS_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
