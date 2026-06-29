'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Input, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEditorialRowActions } from '@/components/admin/admin-row-actions';
import {
  ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { formatAdminDate } from '@/lib/admin-display';
import {
  type AdminListPageSize,
  type AdminListQuery,
  UNASSIGNED_BOARD_KEY,
  buildAdminListRowIndexColumn,
  buildAdminListUrl,
  parseAdminListQuery,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import {
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialContentModule,
  type EditorialEntryStatus,
} from '@/lib/editorial-content';
import type { EditorialBoardOption } from '@/components/editorial/board-multi-select';
import type { AdminEditorialDashboard } from '@/lib/editorial-automation';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

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

export type BoardContentListState = {
  items: AdminEditorialContentListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type BoardContentListClientProps = {
  basePath: string;
  contentModule: EditorialContentModule;
  newButtonLabel?: string;
  showSlugColumn?: boolean;
  initialDashboard: AdminEditorialDashboard;
  initialList: BoardContentListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
  renderEditorModal: (props: {
    open: boolean;
    boardKey: string;
    boardLabel: string;
    availableBoards: EditorialBoardOption[];
    editingEntry: AdminEditorialContentListItem | null;
    onClose: () => void;
    onSaved: (saved: AdminEditorialContentTranslation) => void;
  }) => ReactNode;
};

async function fetchBoardContentList(options: {
  contentModule: EditorialContentModule;
  boardKey: string;
  keyword: string;
  page: number;
  pageSize: AdminListPageSize;
  knownBoardKeys: string[];
}) {
  const params = new URLSearchParams();
  params.set('module', options.contentModule);
  params.set('board_key', options.boardKey);
  params.set('page', String(options.page));
  params.set('page_size', String(options.pageSize));
  if (options.keyword) params.set('keyword', options.keyword);
  if (options.boardKey === UNASSIGNED_BOARD_KEY && options.knownBoardKeys.length) {
    params.set('known_board_keys', options.knownBoardKeys.join(','));
  }

  const response = await fetch(`/api/admin/editorial/content?${params.toString()}`);
  if (!response.ok) {
    throw new Error('加载内容列表失败');
  }

  const payload = (await response.json()) as {
    items: AdminEditorialContentListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function BoardContentListClient({
  basePath,
  contentModule,
  newButtonLabel = '新建内容',
  showSlugColumn = true,
  initialDashboard,
  initialList,
  initialQuery,
  activeLanguages,
  renderEditorModal,
}: BoardContentListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boards = useMemo(
    () => initialDashboard.coverage.filter((board) => board.enabled !== false),
    [initialDashboard.coverage],
  );
  const knownBoardKeys = useMemo(() => boards.map((board) => board.key), [boards]);
  const availableBoards = useMemo<EditorialBoardOption[]>(
    () => boards.map((board) => ({ key: board.key, title: board.title })),
    [boards],
  );
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState<BoardContentListState>(initialList);
  const [query, setQuery] = useState<AdminListQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [activeBoardKey, setActiveBoardKey] = useState(initialQuery.board || boards[0]?.key || UNASSIGNED_BOARD_KEY);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminEditorialContentListItem | null>(null);
  const [isListLoading, startListTransition] = useTransition();
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const hasBoards = boards.length > 0;
  const activeBoard = boards.find((board) => board.key === activeBoardKey);

  const replaceUrl = useCallback((nextQuery: AdminListQuery) => {
    router.replace(buildAdminListUrl(basePath, nextQuery), { scroll: false });
  }, [basePath, router]);

  useEffect(() => {
    if (hydratedPageSizeRef.current) return;
    hydratedPageSizeRef.current = true;
    const stored = readStoredPageSize();
    if (!searchParams.get('page_size') && stored && stored !== initialQuery.pageSize) {
      replaceUrl({ ...initialQuery, pageSize: stored, page: 1 });
    }
  }, [searchParams, initialQuery, replaceUrl]);

  const reloadList = useCallback((nextQuery: AdminListQuery) => {
    startListTransition(async () => {
      try {
        const result = await fetchBoardContentList({
          contentModule,
          boardKey: nextQuery.board,
          keyword: nextQuery.keyword,
          page: nextQuery.page,
          pageSize: nextQuery.pageSize,
          knownBoardKeys,
        });
        setListState(result);
        setQuery(nextQuery);
      } catch {
        void messageApi.error('加载内容列表失败');
      }
    });
  }, [contentModule, knownBoardKeys, messageApi]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    const urlQuery = parseAdminListQuery(
      Object.fromEntries(searchParams.entries()),
      {
        defaultBoard: boards[0]?.key ?? UNASSIGNED_BOARD_KEY,
        storedPageSize: readStoredPageSize(),
      },
    );

    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }

    setSearchInput(urlQuery.keyword);
    setActiveBoardKey(urlQuery.board);
    reloadList(urlQuery);
  }, [searchParams, boards, reloadList]);

  const summary = useMemo(() => ({
    documents: listState.total,
    published: listState.items.filter((item) => item.status === 'published').length,
    currentBoardCount: listState.items.length,
  }), [listState]);

  const modalBoardKey = editingEntry?.boardKey
    ?? (activeBoardKey !== UNASSIGNED_BOARD_KEY ? activeBoardKey : boards[0]?.key ?? '');
  const modalBoardLabel = editingEntry
    ? boards.find((board) => board.key === editingEntry.boardKey)?.title ?? editingEntry.boardKey
    : activeBoard?.title ?? boards[0]?.title ?? '';

  const summaryStats = useMemo(() => [
    { label: '内容总量', value: summary.documents },
    { label: '已发布', value: summary.published },
    { label: hasBoards ? '当前页' : '看板', value: hasBoards ? summary.currentBoardCount : 0 },
  ], [hasBoards, summary]);

  function applyQueryChange(patch: Partial<AdminListQuery>) {
    const nextQuery: AdminListQuery = {
      board: patch.board ?? query.board,
      parentId: patch.parentId ?? query.parentId,
      keyword: patch.keyword ?? query.keyword,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };

    if (patch.pageSize) {
      writeStoredPageSize(patch.pageSize);
    }

    setSearchInput(nextQuery.keyword);
    setActiveBoardKey(nextQuery.board);
    replaceUrl(nextQuery);
  }

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

  function handleEntrySaved(saved: AdminEditorialContentTranslation) {
    void (async () => {
      const response = await fetch(`/api/admin/editorial/content/${saved.contentId}`);
      if (response.ok) {
        const payload = (await response.json()) as { item: AdminEditorialContentListItem };
        setEditingEntry(payload.item);
      }
      reloadList(query);
    })();
  }

  function patchEntryStatus(entry: AdminEditorialContentListItem, status: EditorialEntryStatus) {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/content/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          void messageApi.error('状态更新失败');
          return;
        }

        void messageApi.success(`内容已${entryStatusLabels[status]}`);
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function deleteContent(entry: AdminEditorialContentListItem) {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/content/${entry.id}`, { method: 'DELETE' });
        if (!response.ok) {
          void messageApi.error('内容删除失败');
          return;
        }
        void messageApi.success('内容已删除');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  const contentColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 180,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text ellipsis title={value}>{value}</Typography.Text>
      ),
    },
    ...(showSlugColumn ? [{
      title: 'Slug',
      dataIndex: 'slug',
      width: 160,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text ellipsis title={value}>{value}</Typography.Text>
      ),
    }] : []),
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: EditorialEntryStatus) => <Tag color={entryStatusColors[value]}>{entryStatusLabels[value]}</Tag>,
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 140,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 140,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH,
      render: (_: unknown, row: AdminEditorialContentListItem) => (
        <AdminEditorialRowActions
          loading={pendingEntryId === row.id}
          status={row.status}
          onEdit={() => openContentModal(row)}
          onPublish={() => patchEntryStatus(row, 'published')}
          onArchive={() => patchEntryStatus(row, 'archived')}
          onDelete={() => deleteContent(row)}
        />
      ),
    }),
  ];

  function renderBoardPanel(boardKey: string, isUnassigned = false) {
    return (
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Input.Search
          placeholder="搜索标题、Slug、正文"
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => applyQueryChange({ board: boardKey, keyword: value.trim(), page: 1 })}
          style={{ maxWidth: 360 }}
        />
        {isUnassigned ? (
          <Typography.Text type="secondary">以下内容所属看板已不存在，可继续编辑或删除。</Typography.Text>
        ) : null}
        <Table
          rowKey="id"
          pagination={false}
          tableLayout="fixed"
          style={{ width: '100%' }}
          scroll={adminTableScroll(showSlugColumn ? 980 : 820)}
          dataSource={listState.items}
          columns={isUnassigned ? [
            buildAdminListRowIndexColumn(listState.page, listState.pageSize),
            {
              title: '标题',
              dataIndex: 'title',
              width: 160,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '原看板 Key',
              dataIndex: 'boardKey',
              width: 120,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            ...contentColumns.slice(1),
          ] : [
            buildAdminListRowIndexColumn(listState.page, listState.pageSize),
            ...contentColumns,
          ]}
          locale={{ emptyText: isUnassigned ? '暂无未归属内容' : '该看板下暂无内容' }}
        />
        <AdminListPagination
          page={listState.page}
          pageSize={listState.pageSize}
          total={listState.total}
          disabled={isListLoading}
          onChange={({ page, pageSize }) => applyQueryChange({ board: boardKey, page, pageSize })}
        />
      </Space>
    );
  }

  const tabItems = boards.map((board) => ({
    key: board.key,
    label: `${board.title} (${board.key})`,
    children: activeBoardKey === board.key ? renderBoardPanel(board.key) : null,
  }));

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openContentModal()} disabled={!hasBoards}>
          {newButtonLabel}
        </Button>
      </Space>

      <Card>
        {!hasBoards ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有内容看板，创建看板后即可按分类管理内容。"
          >
            <Link href="/admin/editorial/boards">
              <Button type="primary">前往看板管理</Button>
            </Link>
          </Empty>
        ) : (
          <Tabs
            activeKey={activeBoardKey}
            onChange={(nextBoard) => applyQueryChange({ board: nextBoard, page: 1 })}
            items={tabItems}
          />
        )}
      </Card>

      {renderEditorModal({
        open: contentModalOpen,
        boardKey: modalBoardKey,
        boardLabel: modalBoardLabel,
        availableBoards,
        editingEntry,
        onClose: closeContentModal,
        onSaved: handleEntrySaved,
      })}
    </Space>
  );
}
