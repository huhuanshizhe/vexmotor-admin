'use client';

import { ClockCircleOutlined, HistoryOutlined, RollbackOutlined, ShoppingOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { OrderListView } from '@/lib/order-status';

type OrderViewSwitchProps = {
  current: OrderListView;
  pendingCount?: number;
};

const views: Array<{ key: OrderListView; href: string; label: string; icon: ReactNode }> = [
  { key: 'pending', href: '/admin/orders', label: '待处理订单', icon: <ShoppingOutlined /> },
  { key: 'processed', href: '/admin/orders/processed', label: '已处理订单', icon: <ClockCircleOutlined /> },
  { key: 'refunds', href: '/admin/orders/refunds', label: '退款订单', icon: <RollbackOutlined /> },
  { key: 'history', href: '/admin/orders/history', label: '历史订单', icon: <HistoryOutlined /> },
];

export function OrderViewSwitch({ current, pendingCount }: OrderViewSwitchProps) {
  return (
    <nav className="inquiry-view-switch order-view-switch" aria-label="订单视图切换">
      {views.map((view) => (
        <Link
          key={view.key}
          href={view.href}
          className={`inquiry-view-switch__item${view.key === 'history' ? ' inquiry-view-switch__item--history' : ''}${current === view.key ? ' is-active' : ''}`}
          aria-current={current === view.key ? 'page' : undefined}
        >
          {view.icon}
          <span>{view.label}</span>
          {view.key === 'pending' && typeof pendingCount === 'number' && pendingCount > 0 ? (
            <span className="inquiry-view-switch__badge">{pendingCount}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
