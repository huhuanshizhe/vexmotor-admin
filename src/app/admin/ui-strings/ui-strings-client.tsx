'use client';

import {
  CloudSyncOutlined,
  EditOutlined,
  GlobalOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { adminTableScroll } from '@/components/admin/admin-table';
import type { AdminUiStringRow } from '@/lib/ui-strings';

type UiStringsPayload = {
  items: AdminUiStringRow[];
  groups: string[];
  targetLocales: string[];
};

type TranslationJob = {
  key: string;
  locale: string;
};

type BatchProgressState = {
  open: boolean;
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  currentLabel: string;
  errors: string[];
  running: boolean;
};

function cellId(key: string, locale: string) {
  return `${key}:${locale}`;
}

async function fetchUiStringList(params: {
  group?: string;
  missingOnly?: boolean;
  search?: string;
}): Promise<UiStringsPayload> {
  const searchParams = new URLSearchParams();
  if (params.group) searchParams.set('group', params.group);
  if (params.missingOnly) searchParams.set('missingOnly', '1');
  if (params.search?.trim()) searchParams.set('search', params.search.trim());

  const response = await fetch(`/api/admin/ui-strings?${searchParams.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('加载失败');
  }

  return response.json() as Promise<UiStringsPayload>;
}

async function postTranslateOne(key: string, targetLocale: string) {
  const response = await fetch('/api/admin/ui-strings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'translate-one', key, targetLocale }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'LLM 翻译失败');
  }
  return payload;
}

function buildMissingJobs(rows: AdminUiStringRow[]): TranslationJob[] {
  return rows.flatMap((row) =>
    row.missingLocales.map((locale) => ({
      key: row.key,
      locale,
    })),
  );
}

export function AdminUiStringsClient({ manifestUrl }: { manifestUrl: string }) {
  const [items, setItems] = useState<AdminUiStringRow[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ key: string; locale: string; value: string } | null>(null);
  const [translatingCell, setTranslatingCell] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const batchRunning = Boolean(batchProgress?.running);

  async function loadList(next?: { group?: string; missingOnly?: boolean; search?: string }) {
    const payload = await fetchUiStringList({
      group: next?.group ?? groupFilter,
      missingOnly: next?.missingOnly ?? missingOnly,
      search: next?.search ?? search,
    });
    setItems(payload.items ?? []);
    setGroups(payload.groups ?? []);
    setTargetLocales(payload.targetLocales ?? []);
  }

  function runListLoader(action: () => Promise<void>) {
    startLoading(async () => {
      try {
        await action();
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : '操作失败');
      }
    });
  }

  const translateOne = useCallback(async (key: string, locale: string, options?: { refresh?: boolean; toast?: boolean }) => {
    const id = cellId(key, locale);
    setTranslatingCell(id);
    try {
      await postTranslateOne(key, locale);
      if (options?.toast !== false) {
        messageApi.success('LLM 翻译完成');
      }
      if (options?.refresh !== false) {
        await loadList();
      }
    } finally {
      setTranslatingCell((current) => (current === id ? null : current));
    }
  }, [messageApi]);

  const runBatchTranslate = useCallback(async () => {
    try {
      const payload = await fetchUiStringList({
        group: groupFilter,
        missingOnly: true,
        search,
      });
      const jobs = buildMissingJobs(payload.items ?? []);

      if (!jobs.length) {
        messageApi.info('当前筛选条件下没有缺失的翻译项');
        return;
      }

      setBatchProgress({
        open: true,
        current: 0,
        total: jobs.length,
        succeeded: 0,
        failed: 0,
        currentLabel: '',
        errors: [],
        running: true,
      });

      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];
        const label = `${job.key} (${job.locale.toUpperCase()})`;

        setBatchProgress((current) =>
          current
            ? {
                ...current,
                current: index,
                currentLabel: label,
                succeeded,
                failed,
                errors,
              }
            : current,
        );
        setTranslatingCell(cellId(job.key, job.locale));

        try {
          await postTranslateOne(job.key, job.locale);
          succeeded += 1;
        } catch (error) {
          failed += 1;
          const reason = error instanceof Error ? error.message : 'unknown';
          errors.push(`${job.key}:${job.locale}: ${reason}`);
        }

        setBatchProgress((current) =>
          current
            ? {
                ...current,
                current: index + 1,
                currentLabel: label,
                succeeded,
                failed,
                errors,
              }
            : current,
        );
      }

      setTranslatingCell(null);
      await loadList();

      setBatchProgress((current) =>
        current
          ? {
              ...current,
              running: false,
              current: jobs.length,
            }
          : current,
      );

      if (failed === 0) {
        messageApi.success(`批量翻译完成：${succeeded} 条`);
      } else {
        messageApi.warning(`批量翻译完成：成功 ${succeeded} 条，失败 ${failed} 条`);
      }
    } catch (error) {
      setTranslatingCell(null);
      setBatchProgress(null);
      messageApi.error(error instanceof Error ? error.message : '批量翻译失败');
    }
  }, [groupFilter, messageApi, search]);

  useEffect(() => {
    runListLoader(() => loadList());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(() => {
    const localeColumns = targetLocales.map((locale) => ({
      title: locale.toUpperCase(),
      key: locale,
      width: 220,
      render: (_: unknown, row: AdminUiStringRow) => {
        const translation = row.translations[locale];
        const missing = row.missingLocales.includes(locale);
        const loading = translatingCell === cellId(row.key, locale);

        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Typography.Text type={missing ? 'warning' : undefined} ellipsis>
              {translation?.value || '—'}
            </Typography.Text>
            <Space size={4}>
              <Button
                size="small"
                type="link"
                icon={<EditOutlined />}
                disabled={loading || batchRunning}
                onClick={() => setEditing({ key: row.key, locale, value: translation?.value ?? '' })}
              >
                编辑
              </Button>
              <Button
                size="small"
                type="link"
                icon={<RobotOutlined />}
                loading={loading}
                disabled={batchRunning && !loading}
                onClick={() => {
                  void translateOne(row.key, locale).catch((error) => {
                    messageApi.error(error instanceof Error ? error.message : 'LLM 翻译失败');
                  });
                }}
              >
                LLM
              </Button>
            </Space>
          </Space>
        );
      },
    }));

    return [
      {
        title: 'Key',
        dataIndex: 'key',
        key: 'key',
        width: 260,
        fixed: 'left' as const,
        render: (value: string, row: AdminUiStringRow) => (
          <Space direction="vertical" size={0}>
            <Typography.Text code>{value}</Typography.Text>
            {row.status === 'deprecated' ? <Tag color="default">deprecated</Tag> : null}
          </Space>
        ),
      },
      {
        title: '英文范本',
        dataIndex: 'defaultText',
        key: 'defaultText',
        width: 280,
        ellipsis: true,
      },
      {
        title: '分组',
        dataIndex: 'group',
        key: 'group',
        width: 120,
      },
      ...localeColumns,
    ];
  }, [batchRunning, messageApi, targetLocales, translateOne, translatingCell]);

  const batchPercent = batchProgress?.total
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>文案翻译</span>
          </Space>
        }
        extra={
          <Space wrap>
            <Button icon={<CloudSyncOutlined />} loading={isLoading} disabled={batchRunning} onClick={() => runListLoader(async () => {
              const response = await fetch('/api/admin/ui-strings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync-manifest' }),
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(payload.message ?? '同步失败');
              messageApi.success(`已同步 ${payload.activeCount ?? 0} 条 active key`);
              await loadList();
            })}>
              从前台同步清单
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={isLoading}
              disabled={batchRunning}
              onClick={() => {
                Modal.confirm({
                  title: '重置翻译',
                  content: '将清空除英文外的全部翻译，英文范本保留在 default_text。确认继续？',
                  okText: '重置',
                  cancelText: '取消',
                  onOk: async () => {
                    const response = await fetch('/api/admin/ui-strings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'reset', scope: 'all_translations' }),
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(payload.message ?? '重置失败');
                    messageApi.success('翻译已重置');
                    await loadList();
                  },
                });
              }}
            >
              重置翻译
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={batchRunning}
              disabled={isLoading}
              onClick={() => {
                void runBatchTranslate();
              }}
            >
              LLM 批量翻译缺失项
            </Button>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">清单来源：{manifestUrl}</Typography.Text>
        </Space>

        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索 key 或英文"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={() => runListLoader(() => loadList())}
            style={{ width: 260 }}
            disabled={batchRunning}
          />
          <Select
            allowClear
            placeholder="分组"
            value={groupFilter}
            onChange={setGroupFilter}
            style={{ width: 180 }}
            disabled={batchRunning}
            options={groups.map((group) => ({ value: group, label: group }))}
          />
          <Select
            value={missingOnly ? 'missing' : 'all'}
            onChange={(value) => setMissingOnly(value === 'missing')}
            style={{ width: 160 }}
            disabled={batchRunning}
            options={[
              { value: 'all', label: '全部' },
              { value: 'missing', label: '仅缺失翻译' },
            ]}
          />
          <Button loading={isLoading} disabled={batchRunning} onClick={() => runListLoader(() => loadList())}>
            查询
          </Button>
        </Space>

        <Table
          rowKey="key"
          size="small"
          loading={isLoading && !batchRunning}
          columns={columns}
          dataSource={items}
          scroll={adminTableScroll(columns.length * 220)}
          pagination={{ pageSize: 50, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="LLM 批量翻译进度"
        open={Boolean(batchProgress?.open)}
        closable={!batchProgress?.running}
        maskClosable={false}
        footer={
          batchProgress?.running
            ? null
            : [
                <Button key="close" type="primary" onClick={() => setBatchProgress(null)}>
                  关闭
                </Button>,
              ]
        }
        onCancel={() => {
          if (!batchProgress?.running) {
            setBatchProgress(null);
          }
        }}
      >
        {batchProgress ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Progress percent={batchPercent} status={batchProgress.running ? 'active' : batchProgress.failed ? 'exception' : 'success'} />
            <Typography.Text>
              进度：{batchProgress.current} / {batchProgress.total}
              {batchProgress.total > batchProgress.current ? `（剩余 ${batchProgress.total - batchProgress.current}）` : ''}
            </Typography.Text>
            <Typography.Text type="secondary">
              成功 {batchProgress.succeeded} · 失败 {batchProgress.failed}
            </Typography.Text>
            {batchProgress.currentLabel ? (
              <Typography.Text>
                {batchProgress.running ? '正在翻译：' : '最后一项：'}
                <Typography.Text code>{batchProgress.currentLabel}</Typography.Text>
              </Typography.Text>
            ) : null}
            {batchProgress.errors.length ? (
              <div>
                <Typography.Text type="danger">失败明细（最多显示 10 条）：</Typography.Text>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {batchProgress.errors.slice(0, 10).map((item) => (
                    <li key={item}>
                      <Typography.Text type="danger" style={{ fontSize: 12 }}>{item}</Typography.Text>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Space>
        ) : null}
      </Modal>

      <Modal
        title={editing ? `编辑 ${editing.key} (${editing.locale})` : '编辑翻译'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={() => {
          if (!editing) return;
          runListLoader(async () => {
            const response = await fetch('/api/admin/ui-strings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: editing.key,
                locale: editing.locale,
                value: editing.value,
                source: 'manual',
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message ?? '保存失败');
            messageApi.success('已保存');
            setEditing(null);
            await loadList();
          });
        }}
      >
        <Input.TextArea
          rows={4}
          value={editing?.value ?? ''}
          onChange={(event) => setEditing((current) => (current ? { ...current, value: event.target.value } : current))}
        />
      </Modal>
    </>
  );
}
