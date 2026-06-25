'use client';

import { SaveOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

type CommercePageHeaderProps = {
  title: string;
  description: string;
  statusMessage: string | null;
  isPending: boolean;
  onSave: () => void;
  extra?: ReactNode;
};

export function CommercePageHeader({
  title,
  description,
  statusMessage,
  isPending,
  onSave,
  extra,
}: CommercePageHeaderProps) {
  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 8 }}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{description}</Typography.Paragraph>
      </div>
      <Space wrap>
        {extra}
        {statusMessage ? (
          <Typography.Text type={statusMessage.includes('失败') ? 'danger' : 'secondary'}>
            {statusMessage}
          </Typography.Text>
        ) : null}
        <Button type="primary" icon={<SaveOutlined />} onClick={onSave} loading={isPending}>
          保存配置
        </Button>
      </Space>
    </Space>
  );
}
