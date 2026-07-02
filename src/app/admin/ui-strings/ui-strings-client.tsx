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
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { adminTableScroll } from '@/components/admin/admin-table';
import type { AdminUiStringRow } from '@/lib/ui-strings';

type UiStringsPayload = {
  items: AdminUiStringRow[];
  groups: string[];
  targetLocales: string[];
};

export function AdminUiStringsClient({ manifestUrl }: { manifestUrl: string }) {
  const [items, setItems] = useState<AdminUiStringRow[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ key: string; locale: string; value: string } | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  async function loadList(next?: { group?: string; missingOnly?: boolean; search?: string }) {
    const params = new URLSearchParams();
    const group = next?.group ?? groupFilter;
    const missing = next?.missingOnly ?? missingOnly;
    const query = next?.search ?? search;

    if (group) params.set('group', group);
    if (missing) params.set('missingOnly', '1');
    if (query.trim()) params.set('search', query.trim());

    const response = await fetch(`/api/admin/ui-strings?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('加载失败');
    }

    const payload = (await response.json()) as UiStringsPayload;
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
                onClick={() => setEditing({ key: row.key, locale, value: translation?.value ?? '' })}
              >
                编辑
              </Button>
              <Button
                size="small"
                type="link"
                icon={<RobotOutlined />}
                onClick={() => runListLoader(async () => {
                  const response = await fetch('/api/admin/ui-strings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'translate-one', key: row.key, targetLocale: locale }),
                  });
                  if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.message ?? 'LLM 翻译失败');
                  }
                  messageApi.success('LLM 翻译完成');
                  await loadList();
                })}
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
  }, [targetLocales, messageApi]);

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
            <Button icon={<CloudSyncOutlined />} loading={isLoading} onClick={() => runListLoader(async () => {
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
              loading={isLoading}
              onClick={() => runListLoader(async () => {
                const response = await fetch('/api/admin/ui-strings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'translate-batch',
                    group: groupFilter,
                    limit: 100,
                  }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(payload.message ?? '批量翻译失败');
                messageApi.success(`已翻译 ${payload.translated ?? 0} 条，跳过 ${payload.skipped ?? 0} 条`);
                if (payload.errors?.length) {
                  messageApi.warning(`部分失败：${payload.errors.slice(0, 3).join('; ')}`);
                }
                await loadList();
              })}
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
          />
          <Select
            allowClear
            placeholder="分组"
            value={groupFilter}
            onChange={setGroupFilter}
            style={{ width: 180 }}
            options={groups.map((group) => ({ value: group, label: group }))}
          />
          <Select
            value={missingOnly ? 'missing' : 'all'}
            onChange={(value) => setMissingOnly(value === 'missing')}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'missing', label: '仅缺失翻译' },
            ]}
          />
          <Button loading={isLoading} onClick={() => runListLoader(() => loadList())}>
            查询
          </Button>
        </Space>

        <Table
          rowKey="key"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={items}
          scroll={adminTableScroll(columns.length * 220)}
          pagination={{ pageSize: 50, showSizeChanger: true }}
        />
      </Card>

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
