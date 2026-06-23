'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import type { AdminEditorialContentListItem } from '@/lib/editorial-content';
import type {
  AdminEditorialDashboard,
  EditorialAutomationConfig,
  EditorialCoverageBoard,
  EditorialCoverageMetric,
} from '@/lib/editorial-automation';

type BoardFormValues = {
  key: string;
  title: string;
  note: string;
};

export function AdminEditorialBoardsClient({
  initialDashboard,
  initialEntries,
}: {
  initialDashboard: AdminEditorialDashboard;
  initialEntries: AdminEditorialContentListItem[];
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [entries] = useState(initialEntries);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [boardForm] = Form.useForm<BoardFormValues>();

  const boards = dashboard.coverage;

  const summary = useMemo(() => ({
    boards: boards.length,
    customBoards: boards.filter((item) => item.custom).length,
    documents: entries.length,
  }), [boards, entries.length]);

  const summaryStats = useMemo(() => [
    { label: '看板总数', value: summary.boards },
    { label: '自定义', value: summary.customBoards },
    { label: '关联内容', value: summary.documents },
  ], [summary]);

  async function saveEditorialConfig(nextConfig: EditorialAutomationConfig) {
    const response = await fetch('/api/admin/editorial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextConfig),
    });

    if (!response.ok) throw new Error('保存看板失败');
    const saved = (await response.json()) as AdminEditorialDashboard;
    setDashboard(saved);
  }

  function openBoardModal() {
    boardForm.setFieldsValue({ key: '', title: '', note: '' });
    setBoardModalOpen(true);
  }

  function saveBoard() {
    void boardForm.validateFields().then((values) => {
      startTransition(async () => {
        try {
          const nextBoard: EditorialCoverageBoard = {
            key: values.key.trim(),
            title: values.title.trim(),
            contentType: 'content',
            note: values.note.trim(),
            sourceMode: 'admin-managed',
          };

          await saveEditorialConfig({
            ...dashboard.config,
            coverageBoards: [...dashboard.config.coverageBoards.filter((item) => item.key !== nextBoard.key), nextBoard],
          });
          setBoardModalOpen(false);
          boardForm.resetFields();
          void messageApi.success('看板已新增');
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '看板保存失败');
        }
      });
    });
  }

  function deleteBoard(board: EditorialCoverageMetric) {
    if (!board.custom) return;
    if (entries.some((entry) => entry.boardKey === board.key)) {
      void messageApi.warning('该看板下已有内容，不能删除');
      return;
    }

    startTransition(async () => {
      try {
        await saveEditorialConfig({
          ...dashboard.config,
          coverageBoards: dashboard.config.coverageBoards.filter((item) => item.key !== board.key),
        });
        void messageApi.success('看板已删除');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板删除失败');
      }
    });
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {contextHolder}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          看板管理
        </Typography.Title>
        <AdminPageHeaderStats items={summaryStats} />
      </div>

      <Card title="内容看板" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openBoardModal}>新增看板</Button>}>
        <Table
          rowKey="key"
          pagination={false}
          scroll={{ x: 880 }}
          dataSource={boards}
          columns={[
            { title: '看板', dataIndex: 'title' },
            { title: 'Key', dataIndex: 'key', render: (value: string) => <Tag>{value}</Tag> },
            { title: '内容数量', dataIndex: 'count' },
            { title: '说明', dataIndex: 'note' },
            {
              title: '操作',
              key: 'actions',
              render: (_, row: EditorialCoverageMetric) => row.custom ? (
                <Popconfirm title="确定删除该看板吗？" onConfirm={() => deleteBoard(row)}>
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ) : <Typography.Text type="secondary">默认看板</Typography.Text>,
            },
          ]}
        />
      </Card>

      <Modal open={boardModalOpen} title="新增看板" onCancel={() => setBoardModalOpen(false)} onOk={saveBoard} confirmLoading={isPending} okText="保存">
        <Form<BoardFormValues> form={boardForm} layout="vertical">
          <Form.Item label="Key" name="key" rules={[{ required: true, message: '请输入看板 Key' }]}>
            <Input placeholder="例如 engineering-guides" />
          </Form.Item>
          <Form.Item label="看板名称" name="title" rules={[{ required: true, message: '请输入看板名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="说明" name="note" rules={[{ required: true, message: '请输入说明' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
