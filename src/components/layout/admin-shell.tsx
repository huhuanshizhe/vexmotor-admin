'use client';

import {
  AppstoreOutlined,
  BarsOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GlobalOutlined,
  InboxOutlined,
  OrderedListOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

const { Header, Sider, Content } = Layout;

const items = [
  { key: '/admin', icon: <DashboardOutlined />, label: <Link href="/admin">仪表盘</Link> },
  { key: '/admin/products', icon: <ShoppingOutlined />, label: <Link href="/admin/products">产品管理</Link> },
  { key: '/admin/commerce', icon: <GlobalOutlined />, label: <Link href="/admin/commerce">定价与物流</Link> },
  { key: '/admin/categories', icon: <AppstoreOutlined />, label: <Link href="/admin/categories">分类管理</Link> },
  { key: '/admin/brands', icon: <TagsOutlined />, label: <Link href="/admin/brands">品牌管理</Link> },
  { key: '/admin/orders', icon: <OrderedListOutlined />, label: <Link href="/admin/orders">订单管理</Link> },
  { key: '/admin/inquiries', icon: <InboxOutlined />, label: <Link href="/admin/inquiries">询盘管理</Link> },
  { key: '/admin/customers', icon: <TeamOutlined />, label: <Link href="/admin/customers">客户管理</Link> },
  { key: '/admin/content', icon: <BarsOutlined />, label: <Link href="/admin/content">内容区块</Link> },
  { key: '/admin/content/faq', icon: <FileTextOutlined />, label: <Link href="/admin/content/faq">FAQ管理</Link> },
  { key: '/admin/editorial', icon: <FileTextOutlined />, label: <Link href="/admin/editorial">博客管理</Link> },
];

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const selected =
    [...items]
      .sort((a, b) => b.key.length - a.key.length)
      .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ?? '/admin';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="light" style={{ borderRight: '1px solid #e5e7eb' }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            VexMotor 管理后台
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            工业运动控制电商运营中心
          </Typography.Paragraph>
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} style={{ borderInlineEnd: 0 }} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
          }}
        >
          <div>
            <Typography.Text strong>后台管理系统</Typography.Text>
          </div>
          <Space size="middle">
            <Button href="/" type="default">
              查看商城前台
            </Button>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>管理员</Typography.Text>
            </Space>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f6f7f9' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
