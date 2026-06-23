'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, Popconfirm, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import { ContentEditorModal } from '@/components/editorial/content-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import {
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialEntryStatus,
} from '@/lib/editorial-content';
import type { AdminEditorialDashboard } from '@/lib/editorial-automation';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

const UNASSIGNED_BOARD_KEY = '__unassigned__';

const entryStatusLabels: Record<EditorialEntryStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const entryStatusColors: Record<EditorialEntryStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'red',
};

function sortEntries(entries: AdminEditorialContentListItem[]) {
  return [...entries].sort((left, right) => {
    const leftTime = Date.parse(left.publishedAt ?? left.updatedAt);
    const rightTime = Date.parse(right.publishedAt ?? right.updatedAt);
    return rightTime - leftTime || left.title.localeCompare(right.title);
  });
}

export function AdminEditorialClient({
  initialDashboard,
  initialEntries,
  activeLanguages,
}: {
  initialDashboard: AdminEditorialDashboard;
  initialEntries: AdminEditorialContentListItem[];
  activeLanguages: AdminSiteLanguageRow[];
}) {
  const boards = initialDashboard.coverage;
  const boardKeys = useMemo(() => new Set(boards.map((board) => board.key)), [boards]);
  const [entries, setEntries] = useState(sortEntries(initialEntries));
  const [activeBoardKey, setActiveBoardKey] = useState(boards[0]?.key ?? UNASSIGNED_BOARD_KEY);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminEditorialContentListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const unassignedEntries = useMemo(
    () => entries.filter((entry) => !boardKeys.has(entry.boardKey)),
    [entries, boardKeys],
  );
  const hasBoards = boards.length > 0;
  const activeBoard = boards.find((board) => board.key === activeBoardKey);
  const activeEntries = useMemo(() => {
    if (activeBoardKey === UNASSIGNED_BOARD_KEY) return unassignedEntries;
    return entries.filter((entry) => entry.boardKey === activeBoardKey);
  }, [entries, activeBoardKey, unassignedEntries]);

  const summary = useMemo(() => ({
    documents: entries.length,
    published: entries.filter((item) => item.status === 'published').length,
    currentBoardCount: activeEntries.length,
  }), [entries, activeEntries.length]);

  const modalBoardKey = editingEntry?.boardKey
    ?? (activeBoardKey !== UNASSIGNED_BOARD_KEY ? activeBoardKey : boards[0]?.key ?? '');
  const modalBoardLabel = editingEntry
    ? boards.find((board) => board.key === editingEntry.boardKey)?.title ?? editingEntry.boardKey
    : activeBoard?.title ?? boards[0]?.title ?? '';

  function openContentModal(entry?: AdminEditorialContentListItem) {
    if (!entry && !hasBoards) {
      void messageApi.warning('请先在「看板管理」中创建看板，再新建内容');
      return;
    }
    if (!entry && !activeLanguages.length) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
    }
    setEditingEntry(entry ?? null);
    setContentModalOpen(true);
  }

  function closeContentModal() {
    setContentModalOpen(false);
    setEditingEntry(null);
  }

  async function refreshListItem(contentId: string) {
    const response = await fetch(`/api/admin/editorial/content/${contentId}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { item: AdminEditorialContentListItem };
    return payload.item;
  }

  function handleEntrySaved(saved: AdminEditorialContentTranslation) {
    void refreshListItem(saved.contentId).then((listItem) => {
      if (!listItem) return;
      setEntries((current) => sortEntries(
        current.some((item) => item.id === listItem.id)
          ? current.map((item) => (item.id === listItem.id ? listItem : item))
          : [listItem, ...current],
      ));
      setActiveBoardKey(listItem.boardKey);
      setEditingEntry((current) => current ?? listItem);
    });
  }

  function patchEntryStatus(entry: AdminEditorialContentListItem, status: EditorialEntryStatus) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/editorial/content/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        void messageApi.error('状态更新失败');
        return;
      }

      const updated = (await response.json()) as AdminEditorialContentListItem;
      setEntries((current) => sortEntries(current.map((item) => (item.id === updated.id ? updated : item))));
      void messageApi.success(`内容已${entryStatusLabels[status]}`);
    });
  }

  function deleteContent(entry: AdminEditorialContentListItem) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/editorial/content/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        void messageApi.error('内容删除失败');
        return;
      }
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      void messageApi.success('内容已删除');
    });
  }

  const contentColumns = [
    { title: '标题', dataIndex: 'title' },
    { title: 'Slug', dataIndex: 'slug' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: EditorialEntryStatus) => <Tag color={entryStatusColors[value]}>{entryStatusLabels[value]}</Tag>,
    },
    { title: '发布时间', dataIndex: 'publishedAt', render: (value: string | null) => formatAdminDate(value) },
    { title: '最近更新', dataIndex: 'updatedAt', render: (value: string) => formatAdminDate(value) },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, row: AdminEditorialContentListItem) => (
        <Space wrap>
          <Button icon={<EditOutlined />} onClick={() => openContentModal(row)} />
          {row.status !== 'published' && row.status !== 'archived' ? (
            <Popconfirm
              title="确定立即发布吗？"
              description="发布后内容将对访客可见。"
              onConfirm={() => patchEntryStatus(row, 'published')}
            >
              <Button loading={isPending}>立即发布</Button>
            </Popconfirm>
          ) : null}
          {row.status !== 'archived' ? (
            <Popconfirm
              title="确定归档该内容吗？"
              description="归档后内容将下线，且无法再从列表直接发布。"
              onConfirm={() => patchEntryStatus(row, 'archived')}
            >
              <Button loading={isPending}>归档</Button>
            </Popconfirm>
          ) : null}
          <Popconfirm title="确定删除该内容吗？" onConfirm={() => deleteContent(row)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    ...boards.map((board) => ({
      key: board.key,
      label: `${board.title} (${entries.filter((entry) => entry.boardKey === board.key).length})`,
      children: (
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 1280 }}
          dataSource={entries.filter((entry) => entry.boardKey === board.key)}
          columns={contentColumns}
          locale={{ emptyText: '该看板下暂无内容' }}
        />
      ),
    })),
    ...(unassignedEntries.length > 0 ? [{
      key: UNASSIGNED_BOARD_KEY,
      label: `未归属看板 (${unassignedEntries.length})`,
      children: (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Text type="secondary">以下内容所属看板已不存在，可继续编辑或删除。</Typography.Text>
          <Table
            rowKey="id"
            pagination={false}
            scroll={{ x: 1280 }}
            dataSource={unassignedEntries}
            columns={[
              { title: '标题', dataIndex: 'title' },
              { title: '原看板 Key', dataIndex: 'boardKey', render: (value: string) => <Tag>{value}</Tag> },
              ...contentColumns.slice(1),
            ]}
          />
        </Space>
      ),
    }] : []),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <div>
        <Typography.Title level={2}>博客管理</Typography.Title>
        <Typography.Paragraph type="secondary">按看板管理内容资产。切换标签页查看不同看板下的内容列表。</Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Statistic title="内容总量" value={summary.documents} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="已发布" value={summary.published} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title={hasBoards ? '当前看板内容' : '看板数量'} value={hasBoards ? summary.currentBoardCount : 0} /></Card></Col>
      </Row>

      <Card
        title="内容"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openContentModal()} disabled={!hasBoards}>
            新建内容
          </Button>
        }
      >
        {!hasBoards ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              unassignedEntries.length > 0
                ? '当前没有可用看板，但仍有历史内容可查看。请先创建看板，再新建内容。'
                : '还没有内容看板，创建看板后即可按分类管理内容。'
            }
          >
            <Link href="/admin/editorial/boards">
              <Button type="primary">前往看板管理</Button>
            </Link>
          </Empty>
        ) : (
          <Tabs activeKey={activeBoardKey} onChange={setActiveBoardKey} items={tabItems} />
        )}

        {!hasBoards && unassignedEntries.length > 0 ? (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>历史内容</Typography.Title>
            <Table
              rowKey="id"
              pagination={false}
              scroll={{ x: 1280 }}
              dataSource={unassignedEntries}
              columns={[
                { title: '标题', dataIndex: 'title' },
                { title: '原看板 Key', dataIndex: 'boardKey', render: (value: string) => <Tag>{value}</Tag> },
                ...contentColumns.slice(1),
              ]}
            />
          </div>
        ) : null}
      </Card>

      <ContentEditorModal
        open={contentModalOpen}
        boardKey={modalBoardKey}
        boardLabel={modalBoardLabel}
        activeLanguages={activeLanguages}
        editingEntry={editingEntry}
        onClose={closeContentModal}
        onSaved={handleEntrySaved}
      />
    </Space>
  );
}
