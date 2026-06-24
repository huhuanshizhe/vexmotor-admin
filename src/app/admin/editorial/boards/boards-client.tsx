'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Space, Table, Tag, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
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
  const [editingBoardKey, setEditingBoardKey] = useState<string | null>(null);
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

  function openBoardModal(board?: EditorialCoverageMetric) {
    if (board) {
      setEditingBoardKey(board.key);
      boardForm.setFieldsValue({ key: board.key, title: board.title, note: board.note });
    } else {
      setEditingBoardKey(null);
      boardForm.setFieldsValue({ key: '', title: '', note: '' });
    }
    setBoardModalOpen(true);
  }

  function closeBoardModal() {
    setBoardModalOpen(false);
    setEditingBoardKey(null);
    boardForm.resetFields();
  }

  function saveBoard() {
    void boardForm.validateFields().then((values) => {
      startTransition(async () => {
        try {
          const slug = (editingBoardKey ?? values.key).trim();
          const existing = dashboard.config.coverageBoards.find((item) => item.key === slug);
          const nextBoard: EditorialCoverageBoard = {
            key: slug,
            title: values.title.trim(),
            contentType: 'content',
            note: values.note.trim(),
            sourceMode: existing?.sourceMode ?? 'admin-managed',
            enabled: existing?.enabled !== false,
          };

          await saveEditorialConfig({
            ...dashboard.config,
            coverageBoards: [
              ...dashboard.config.coverageBoards.filter((item) => item.key !== slug),
              nextBoard,
            ],
          });
          closeBoardModal();
          void messageApi.success(editingBoardKey ? '看板已更新' : '看板已新增');
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '看板保存失败');
        }
      });
    });
  }

  function confirmDeleteBoard(board: EditorialCoverageMetric) {
    if (board.count > 0) {
      void messageApi.warning('该看板下已有内容，无法删除');
      return;
    }
    if (!board.custom) {
      void messageApi.warning('系统默认看板不可删除');
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

  function toggleBoardEnabled(board: EditorialCoverageMetric, enabled: boolean) {
    startTransition(async () => {
      try {
        await saveEditorialConfig({
          ...dashboard.config,
          coverageBoards: dashboard.config.coverageBoards.map((item) =>
            item.key === board.key ? { ...item, enabled } : item
          ),
        });
        void messageApi.success(enabled ? '看板已启用' : '看板已停用');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板状态更新失败');
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openBoardModal()}>新增看板</Button>
      </Space>

      <Card>
        <Table
          rowKey="key"
          pagination={false}
          tableLayout="fixed"
          style={{ width: '100%' }}
          scroll={adminTableScroll(920)}
          dataSource={boards}
          columns={[
            buildAdminListRowIndexColumn(1, Math.max(boards.length, 1)),
            {
              title: '看板',
              dataIndex: 'title',
              width: 180,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: 'Key',
              dataIndex: 'key',
              width: 140,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: '内容数量',
              dataIndex: 'count',
              width: 88,
              align: 'center' as const,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              width: 72,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: boolean) => (
                <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
              ),
            },
            {
              title: '说明',
              dataIndex: 'note',
              width: 240,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            adminTableFixedActionsColumn({
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: EditorialCoverageMetric) => (
                <AdminEntityRowActions
                  loading={isPending}
                  isActive={row.enabled}
                  entityName="看板"
                  onEdit={() => openBoardModal(row)}
                  onToggleActive={() => toggleBoardEnabled(row, !row.enabled)}
                  onDelete={() => confirmDeleteBoard(row)}
                  toggleDisableDescription="停用后内容管理页将不再显示该看板。"
                  toggleEnableDescription="启用后该看板将恢复在内容管理页展示。"
                />
              ),
            }),
          ]}
        />
      </Card>

      <Modal
        open={boardModalOpen}
        title={editingBoardKey ? '编辑看板' : '新增看板'}
        onCancel={closeBoardModal}
        onOk={saveBoard}
        confirmLoading={isPending}
        okText="保存"
      >
        <Form<BoardFormValues> form={boardForm} layout="vertical">
          <Form.Item label="Key" name="key" rules={[{ required: true, message: '请输入看板 Key' }]}>
            <Input placeholder="例如 engineering-guides" disabled={Boolean(editingBoardKey)} />
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
