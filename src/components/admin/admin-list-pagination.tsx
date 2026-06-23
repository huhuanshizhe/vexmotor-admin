'use client';

import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LeftOutlined,
  RightOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import {
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  getTotalPages,
} from '@/lib/admin-list-query';

type AdminListPaginationProps = {
  page: number;
  pageSize: AdminListPageSize;
  total: number;
  disabled?: boolean;
  onChange: (next: { page: number; pageSize: AdminListPageSize }) => void;
};

function buildVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>();

  for (let index = 1; index <= Math.min(3, totalPages); index += 1) {
    pages.add(index);
  }

  for (let index = Math.max(1, totalPages - 2); index <= totalPages; index += 1) {
    pages.add(index);
  }

  for (let index = page - 3; index <= page + 3; index += 1) {
    if (index >= 1 && index <= totalPages) {
      pages.add(index);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export function AdminListPagination({
  page,
  pageSize,
  total,
  disabled = false,
  onChange,
}: AdminListPaginationProps) {
  const totalPages = getTotalPages(total, pageSize);
  const visiblePages = buildVisiblePages(page, totalPages);
  const [jumpValue, setJumpValue] = useState('');

  function goToPage(nextPage: number) {
    const normalized = Math.min(totalPages, Math.max(1, nextPage));
    if (normalized !== page) {
      onChange({ page: normalized, pageSize });
    }
  }

  function handleJump() {
    const parsed = Number(jumpValue);
    if (!Number.isFinite(parsed)) return;
    goToPage(Math.floor(parsed));
    setJumpValue('');
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
      <Typography.Text type="secondary">
        第 {page} / {totalPages} 页，共 {total} 条
      </Typography.Text>

      <Space wrap size="small">
        <Button
          icon={<VerticalRightOutlined />}
          disabled={disabled || page <= 1}
          onClick={() => goToPage(1)}
          title="首页"
        />
        {totalPages > 10 ? (
          <Button
            icon={<DoubleLeftOutlined />}
            disabled={disabled || page <= 1}
            onClick={() => goToPage(page - 10)}
            title="前 10 页"
          />
        ) : null}
        <Button
          icon={<LeftOutlined />}
          disabled={disabled || page <= 1}
          onClick={() => goToPage(page - 1)}
          title="前一页"
        />

        {visiblePages.map((value, index) => {
          const previous = visiblePages[index - 1];
          const showGap = index > 0 && previous !== undefined && value - previous > 1;
          return (
            <Space key={value} size={4}>
              {showGap ? <Typography.Text type="secondary">...</Typography.Text> : null}
              <Button
                type={value === page ? 'primary' : 'default'}
                disabled={disabled}
                onClick={() => goToPage(value)}
              >
                {value}
              </Button>
            </Space>
          );
        })}

        <Button
          icon={<RightOutlined />}
          disabled={disabled || page >= totalPages}
          onClick={() => goToPage(page + 1)}
          title="后一页"
        />
        {totalPages > 10 ? (
          <Button
            icon={<DoubleRightOutlined />}
            disabled={disabled || page >= totalPages}
            onClick={() => goToPage(page + 10)}
            title="后 10 页"
          />
        ) : null}
        <Button
          icon={<VerticalLeftOutlined />}
          disabled={disabled || page >= totalPages}
          onClick={() => goToPage(totalPages)}
          title="尾页"
        />

        <Space.Compact>
          <Input
            style={{ width: 72 }}
            placeholder="页码"
            value={jumpValue}
            disabled={disabled}
            onChange={(event) => setJumpValue(event.target.value.replace(/[^\d]/g, ''))}
            onPressEnter={handleJump}
          />
          <Button disabled={disabled} onClick={handleJump}>跳转</Button>
        </Space.Compact>

        <Select<AdminListPageSize>
          style={{ width: 112 }}
          value={pageSize}
          disabled={disabled}
          options={ADMIN_LIST_PAGE_SIZE_OPTIONS.map((value) => ({ value, label: `${value} 条/页` }))}
          onChange={(value) => onChange({ page: 1, pageSize: value })}
        />
      </Space>
    </div>
  );
}
