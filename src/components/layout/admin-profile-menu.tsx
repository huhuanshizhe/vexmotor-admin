'use client';

import { DownOutlined, KeyOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Space, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { AdminResetPasswordModal } from '@/components/layout/admin-reset-password-modal';

export function AdminProfileMenu() {
  const { data: session } = useSession();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const displayName = session?.user?.name?.trim() || session?.user?.email || '管理员';

  async function handleResetPassword(password: string) {
    setResetting(true);
    try {
      const response = await fetch('/api/admin/profile/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? '重置密码失败');
      }

      message.success('密码已重置，请使用新密码重新登录');
      setResetPasswordOpen(false);
      await signOut({ callbackUrl: '/admin/login' });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setResetting(false);
    }
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'reset-password',
      icon: <KeyOutlined />,
      label: '重置密码',
      onClick: () => setResetPasswordOpen(true),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => void signOut({ callbackUrl: '/admin/login' }),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Space style={{ cursor: 'pointer', userSelect: 'none' }}>
          <Avatar icon={<UserOutlined />} />
          <Typography.Text>{displayName}</Typography.Text>
          <DownOutlined style={{ fontSize: 10, color: '#677489' }} />
        </Space>
      </Dropdown>

      <AdminResetPasswordModal
        open={resetPasswordOpen}
        loading={resetting}
        onClose={() => setResetPasswordOpen(false)}
        onSubmit={(password) => void handleResetPassword(password)}
      />
    </>
  );
}
