'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Space, Table, Tag, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import { normalizeEntityKeyForSave, normalizeEntityKeyInput } from '@/lib/admin-entity-key';
import {
  type AdminProductBoardsDashboard,
  type ProductBoardConfig,
  type ProductCoverageBoard,
  type ProductCoverageMetric,
  upsertProductCoverageBoard,
} from '@/lib/product-boards';

type BoardFormValues = {
  key: string;
  title: string;
  note: string;
};

export function AdminProductBoardsClient({
  initialDashboard,
}: {
  initialDashboard: AdminProductBoardsDashboard;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoardKey, setEditingBoardKey] = useState<string | null>(null);
  const [isModalPending, startModalTransition] = useTransition();
  const [pendingBoardKey, setPendingBoardKey] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [boardForm] = Form.useForm<BoardFormValues>();

  const boards = dashboard.coverage;

  const summaryStats = useMemo(() => [
    { label: '看板总数', value: dashboard.summary.boardCount },
    { label: '自定义', value: dashboard.summary.customBoardCount },
    { label: '关联产品', value: dashboard.summary.assignedProductCount },
  ], [dashboard.summary]);

  async function saveProductBoardConfig(nextConfig: ProductBoardConfig) {
    const response = await fetch('/api/admin/products/boards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextConfig),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message ?? '保存看板失败');
    }

    const saved = (await response.json()) as AdminProductBoardsDashboard;
    setDashboard(saved);
  }

  function openBoardModal(board?: ProductCoverageMetric) {
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
      startModalTransition(async () => {
        try {
          const boardKey = editingBoardKey ?? normalizeEntityKeyForSave(values.key);
          if (!boardKey) {
            void messageApi.error('Key 只能包含小写英文字母和连字符');
            return;
          }

          if (!editingBoardKey && dashboard.config.coverageBoards.some((item) => item.key === boardKey)) {
            void messageApi.error('Key 已被占用');
            return;
          }

          const existing = dashboard.config.coverageBoards.find((item) => item.key === boardKey);
          const nextBoard: ProductCoverageBoard = {
            key: boardKey,
            title: values.title.trim(),
            note: values.note.trim(),
            sourceMode: existing?.sourceMode ?? 'admin-managed',
            enabled: existing?.enabled !== false,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
          };

          await saveProductBoardConfig({
            coverageBoards: editingBoardKey
              ? upsertProductCoverageBoard(dashboard.config.coverageBoards, boardKey, nextBoard)
              : [...dashboard.config.coverageBoards, nextBoard],
          });
          closeBoardModal();
          void messageApi.success('保存成功');
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '保存失败');
        }
      });
    });
  }

  function confirmDeleteBoard(board: ProductCoverageMetric) {
    if (board.count > 0) {
      void messageApi.warning('该看板下已有产品，无法删除');
      return;
    }
    if (!board.custom) {
      void messageApi.warning('系统默认看板不可删除');
      return;
    }

    setPendingBoardKey(board.key);
    void (async () => {
      try {
        await saveProductBoardConfig({
          coverageBoards: dashboard.config.coverageBoards.filter((item) => item.key !== board.key),
        });
        void messageApi.success('看板已删除');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板删除失败');
      } finally {
        setPendingBoardKey(null);
      }
    })();
  }

  function toggleBoardEnabled(board: ProductCoverageMetric, enabled: boolean) {
    setPendingBoardKey(board.key);
    void (async () => {
      try {
        await saveProductBoardConfig({
          coverageBoards: dashboard.config.coverageBoards.map((item) =>
            item.key === board.key ? { ...item, enabled } : item
          ),
        });
        void messageApi.success(enabled ? '看板已启用' : '看板已停用');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板状态更新失败');
      } finally {
        setPendingBoardKey(null);
      }
    })();
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
          scroll={adminTableScroll(1000)}
          dataSource={boards}
          columns={[
            buildAdminListRowIndexColumn(1, Math.max(boards.length, 1)),
            {
              title: '看板',
              dataIndex: 'title',
              width: 160,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '类型',
              dataIndex: 'custom',
              width: 96,
              align: 'center' as const,
              onHeaderCell: adminTableNowrapHeader,
              render: (_: boolean | undefined, row: ProductCoverageMetric) => (
                row.custom
                  ? <Tag>自定义</Tag>
                  : <Tag color="blue">系统内置</Tag>
              ),
            },
            {
              title: 'Key',
              dataIndex: 'key',
              width: 130,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: '关联产品数',
              dataIndex: 'count',
              width: 100,
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
              render: (_: unknown, row: ProductCoverageMetric) => (
                <AdminEntityRowActions
                  loading={pendingBoardKey === row.key}
                  isActive={row.enabled}
                  entityName="看板"
                  onEdit={() => openBoardModal(row)}
                  onToggleActive={() => toggleBoardEnabled(row, !row.enabled)}
                  onDelete={() => confirmDeleteBoard(row)}
                  showDelete={Boolean(row.custom)}
                  toggleDisableDescription="停用后产品编辑页将不再显示该看板。"
                  toggleEnableDescription="启用后该看板将恢复在产品编辑页展示。"
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
        confirmLoading={isModalPending}
        okText="保存"
      >
        <Form<BoardFormValues> form={boardForm} layout="vertical">
          <Form.Item
            label="Key"
            name="key"
            rules={[{ required: true, message: '请输入看板 Key' }]}
            getValueFromEvent={(event) => normalizeEntityKeyInput(event.target.value)}
          >
            <Input placeholder="例如 seasonal-picks" disabled={Boolean(editingBoardKey)} />
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
