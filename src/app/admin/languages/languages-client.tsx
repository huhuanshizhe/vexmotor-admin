'use client';

import { GlobalOutlined, PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import type { CommonLanguage } from '@/lib/languages';
import type { AdminSiteLanguageRow, SiteLanguageStatus } from '@/server/admin/languages';

type LanguagesPayload = {
  items: AdminSiteLanguageRow[];
  availableLanguages: CommonLanguage[];
};

function groupLanguageOptions(languages: CommonLanguage[]) {
  const grouped = new Map<string, CommonLanguage[]>();
  for (const language of languages) {
    grouped.set(language.region, [...(grouped.get(language.region) ?? []), language]);
  }

  return Array.from(grouped.entries()).map(([region, items]) => ({
    label: region,
    options: items
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((language) => ({
        value: language.code,
        label: `${language.name} / ${language.nativeName} (${language.code})`,
      })),
  }));
}

export function AdminLanguagesClient({
  initialRows,
  initialAvailableLanguages,
}: {
  initialRows: AdminSiteLanguageRow[];
  initialAvailableLanguages: CommonLanguage[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [availableLanguages, setAvailableLanguages] = useState(initialAvailableLanguages);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const languageOptions = useMemo(() => groupLanguageOptions(availableLanguages), [availableLanguages]);

  async function reloadRows(nextSearch = search) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }

    const response = await fetch(`/api/admin/languages${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = (await response.json()) as LanguagesPayload;
    setRows(payload.items ?? []);
    setAvailableLanguages(payload.availableLanguages ?? []);
  }

  function addLanguage() {
    if (!selectedCode) {
      void messageApi.warning('请选择要添加的语言');
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedCode }),
      });

      if (!response.ok) {
        void messageApi.error('语言添加失败');
        return;
      }

      setOpen(false);
      setSelectedCode(undefined);
      await reloadRows();
      void messageApi.success('语言已添加');
    });
  }

  function updateLanguage(code: string, input: { status?: SiteLanguageStatus; isDefault?: boolean; sortOrder?: number }) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/languages/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        void messageApi.error('语言更新失败，请确认默认语言不可停用');
        return;
      }

      await reloadRows();
      void messageApi.success('语言已更新');
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>多语言</Typography.Title>
          <Typography.Paragraph type="secondary">
            管理当前站点启用的语言种类；添加语言时从预设常用语言和小语种枚举中选择。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          添加语言
        </Button>
      </Space>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索代码、语言名、地区或国家代码"
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => {
              setSearch(value);
              startTransition(async () => {
                await reloadRows(value);
              });
            }}
            style={{ maxWidth: 420 }}
          />
          <Typography.Text type="secondary">
            已添加 {rows.length} 门语言，可添加 {availableLanguages.length} 门
          </Typography.Text>
        </Space>

        <Table
          rowKey="code"
          loading={isPending}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1080 }}
          columns={[
            {
              title: '语言',
              key: 'language',
              render: (_, row: AdminSiteLanguageRow) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{row.name}</Typography.Text>
                  <Typography.Text type="secondary">{row.nativeName}</Typography.Text>
                </Space>
              ),
            },
            { title: '代码', dataIndex: 'code', width: 100, render: (value: string) => <Tag>{value}</Tag> },
            { title: '地区', dataIndex: 'region', width: 180 },
            {
              title: '书写方向',
              dataIndex: 'direction',
              width: 120,
              render: (value: AdminSiteLanguageRow['direction']) => <Tag color={value === 'rtl' ? 'purple' : 'blue'}>{value.toUpperCase()}</Tag>,
            },
            {
              title: '国家/地区',
              dataIndex: 'countryCodes',
              render: (values: string[]) => (
                <Space size={[4, 4]} wrap>
                  {values.length ? values.map((value) => <Tag key={value}>{value}</Tag>) : <Typography.Text type="secondary">未设置</Typography.Text>}
                </Space>
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 120,
              render: (value: SiteLanguageStatus, row: AdminSiteLanguageRow) => (
                <Switch
                  checked={value === 'active'}
                  disabled={row.isDefault}
                  checkedChildren="启用"
                  unCheckedChildren="停用"
                  onChange={(checked) => updateLanguage(row.code, { status: checked ? 'active' : 'inactive' })}
                />
              ),
            },
            {
              title: '默认',
              dataIndex: 'isDefault',
              width: 110,
              render: (value: boolean, row: AdminSiteLanguageRow) =>
                value ? (
                  <Tag icon={<StarFilled />} color="gold">
                    默认
                  </Tag>
                ) : (
                  <Popconfirm title="设为默认语言？" onConfirm={() => updateLanguage(row.code, { isDefault: true })}>
                    <Button size="small" icon={<StarOutlined />}>
                      设为默认
                    </Button>
                  </Popconfirm>
                ),
            },
            {
              title: '排序',
              dataIndex: 'sortOrder',
              width: 120,
              render: (value: number, row: AdminSiteLanguageRow) => (
                <InputNumber min={0} value={value} onChange={(next) => updateLanguage(row.code, { sortOrder: Number(next ?? 0) })} />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title="添加站点语言"
        onCancel={() => {
          setOpen(false);
          setSelectedCode(undefined);
        }}
        onOk={addLanguage}
        confirmLoading={isPending}
        okText="添加"
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary">
            从常用语言枚举中选择一门语言添加到当前站点。已添加的语言不会重复出现在列表中。
          </Typography.Paragraph>
          <Select
            showSearch
            allowClear
            value={selectedCode}
            options={languageOptions}
            optionFilterProp="label"
            placeholder="选择语言，如 French / Français (fr)"
            onChange={(value) => setSelectedCode(value)}
            style={{ width: '100%' }}
            suffixIcon={<GlobalOutlined />}
          />
        </Space>
      </Modal>
    </Space>
  );
}
