'use client';

import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';

import {
  formatAdminDate,
  formatAdminMoney,
  inquiryStatusColors,
  inquiryStatusLabels,
  orderStatusColors,
  orderStatusLabels,
  productStatusColors,
  productStatusLabels,
} from '@/lib/admin-display';

type OverviewProps = {
  metrics: {
    activeProducts: number;
    totalCategories: number;
    totalBrands: number;
    totalCustomers: number;
    pendingCustomers: number;
    totalOrders: number;
    pendingOrders: number;
    totalInquiries: number;
    openInquiries: number;
    lowStockProducts: number;
    activeBlocks: number;
    publishedPages: number;
    paidRevenue: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: keyof typeof orderStatusLabels;
    totalAmount: string;
    customerEmail: string | null;
    customerName: string | null;
    customerLastName: string | null;
    createdAt: string | Date;
  }>;
  recentInquiries: Array<{
    id: string;
    status: keyof typeof inquiryStatusLabels;
    fullName: string;
    email: string;
    company: string | null;
    productName: string;
    createdAt: string | Date;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    status: keyof typeof productStatusLabels;
  }>;
};

export function AdminOverviewClient({ metrics, recentOrders, recentInquiries, lowStockItems }: OverviewProps) {
  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>运营仪表盘</Typography.Title>
        <Typography.Paragraph type="secondary">
          面向 B2B 工业品商城的后台总览，聚合产品、客户、订单、询盘与内容运营的核心指标。
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="上架产品" value={metrics.activeProducts} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="分类总数" value={metrics.totalCategories} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="品牌总数" value={metrics.totalBrands} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="客户账户" value={metrics.totalCustomers} suffix={`待审 ${metrics.pendingCustomers}`} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="订单总数" value={metrics.totalOrders} suffix={`待处理 ${metrics.pendingOrders}`} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="询盘总数" value={metrics.totalInquiries} suffix={`跟进中 ${metrics.openInquiries}`} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="内容区块" value={metrics.activeBlocks} suffix={`已发布页面 ${metrics.publishedPages}`} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="已收款销售额" value={metrics.paidRevenue} precision={2} prefix="$" /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="最近订单">
            <Table
              rowKey="id"
              pagination={false}
              scroll={{ x: 720 }}
              dataSource={recentOrders}
              columns={[
                { title: '订单号', dataIndex: 'orderNumber' },
                {
                  title: '客户',
                  key: 'customer',
                  render: (_, row) => [
                    `${row.customerName ?? ''} ${row.customerLastName ?? ''}`.trim() || null,
                    row.customerEmail ?? null,
                  ].filter(Boolean).join(' · ') || '游客下单',
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: keyof typeof orderStatusLabels) => (
                    <Tag color={orderStatusColors[value]}>{orderStatusLabels[value]}</Tag>
                  ),
                },
                {
                  title: '金额',
                  dataIndex: 'totalAmount',
                  render: (value: string) => formatAdminMoney(value),
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  render: (value: string | Date) => formatAdminDate(value),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="低库存预警" extra={<Typography.Text type="secondary">低于 20 件</Typography.Text>}>
            <Table
              rowKey="id"
              pagination={false}
              size="small"
              dataSource={lowStockItems}
              columns={[
                {
                  title: '产品',
                  key: 'product',
                  render: (_, row) => (
                    <div>
                      <div>{row.name}</div>
                      <Typography.Text type="secondary">{row.sku}</Typography.Text>
                    </div>
                  ),
                },
                { title: '库存', dataIndex: 'stockQuantity' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: keyof typeof productStatusLabels) => (
                    <Tag color={productStatusColors[value]}>{productStatusLabels[value]}</Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近询盘">
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 720 }}
          dataSource={recentInquiries}
          columns={[
            { title: '客户', dataIndex: 'fullName' },
            { title: '邮箱', dataIndex: 'email' },
            { title: '公司', dataIndex: 'company', render: (value: string | null) => value ?? '未填写' },
            { title: '目标产品', dataIndex: 'productName' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: keyof typeof inquiryStatusLabels) => (
                <Tag color={inquiryStatusColors[value]}>{inquiryStatusLabels[value]}</Tag>
              ),
            },
            {
              title: '提交时间',
              dataIndex: 'createdAt',
              render: (value: string | Date) => formatAdminDate(value),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
