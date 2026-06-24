import { Modal } from 'antd';

import type { ProductStatus } from '@/lib/product-content';

export function confirmProductListingChange(
  nextStatus: Extract<ProductStatus, 'active' | 'inactive'>,
  onConfirm: () => void,
) {
  const isListing = nextStatus === 'active';

  Modal.confirm({
    title: isListing ? '确定上架该产品吗？' : '确定下架该产品吗？',
    content: isListing
      ? '上架后产品将恢复在前台展示。'
      : '下架后前台将不再展示该产品。',
    okText: isListing ? '上架' : '下架',
    cancelText: '取消',
    okButtonProps: isListing ? undefined : { danger: true },
    onOk: onConfirm,
  });
}
