'use client';

import { CommentOutlined, HistoryOutlined, RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type InquiryView = 'active' | 'history';

type InquiryViewSwitchProps = {
  current: InquiryView;
  activeCount?: number;
};

export function InquiryViewSwitch({ current, activeCount }: InquiryViewSwitchProps) {
  return (
    <nav className="inquiry-view-switch" aria-label="询盘视图切换">
      <Link
        href="/admin/inquiries"
        className={`inquiry-view-switch__item${current === 'active' ? ' is-active' : ''}`}
        aria-current={current === 'active' ? 'page' : undefined}
      >
        <CommentOutlined />
        <span>待处理询盘</span>
        {typeof activeCount === 'number' && activeCount > 0 ? (
          <span className="inquiry-view-switch__badge">{activeCount}</span>
        ) : null}
      </Link>
      <Link
        href="/admin/inquiries/history"
        className={`inquiry-view-switch__item inquiry-view-switch__item--history${current === 'history' ? ' is-active' : ''}`}
        aria-current={current === 'history' ? 'page' : undefined}
      >
        <HistoryOutlined />
        <span>历史询盘</span>
        {current === 'active' ? <RightOutlined className="inquiry-view-switch__arrow" /> : null}
      </Link>
    </nav>
  );
}
