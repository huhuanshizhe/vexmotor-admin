'use client';

import { EditOutlined, GlobalOutlined, PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AdminActionIconButton } from '@/components/admin/admin-row-actions';
import { adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';

import { COMMON_CURRENCIES, formatCurrencyLabel, getDefaultCurrencyForLanguage } from '@/lib/currencies';
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

function groupCurrencyOptions() {
  const grouped = new Map<string, typeof COMMON_CURRENCIES[number][]>();
  for (const currency of COMMON_CURRENCIES) {
    grouped.set(currency.region, [...(grouped.get(currency.region) ?? []), currency]);
  }

  return Array.from(grouped.entries()).map(([region, items]) => ({
    label: region,
    options: items
      .slice()
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((currency) => ({
        value: currency.code,
        label: `${currency.code} — ${currency.name} (${currency.symbol})`,
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
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>();
  const [editingRow, setEditingRow] = useState<AdminSiteLanguageRow | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const languageOptions = useMemo(() => groupLanguageOptions(availableLanguages), [availableLanguages]);
  const currencyOptions = useMemo(() => groupCurrencyOptions(), []);

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

  function resetAddModal() {
    setOpen(false);
    setSelectedCode(undefined);
    setSelectedCurrency(undefined);
  }

  function resetEditModal() {
    setEditOpen(false);
    setEditingRow(null);
    setEditingCurrency(undefined);
  }

  function openEditModal(row: AdminSiteLanguageRow) {
    setEditingRow(row);
    setEditingCurrency(row.currencyCode);
    setEditOpen(true);
  }

  function handleLanguageChange(code: string | undefined) {
    setSelectedCode(code);
    if (code) {
      setSelectedCurrency(getDefaultCurrencyForLanguage(code));
    } else {
      setSelectedCurrency(undefined);
    }
  }

  function addLanguage() {
    if (!selectedCode) {
      void messageApi.warning('请选择要添加的语言');
      return;
    }

    if (!selectedCurrency) {
      void messageApi.warning('请选择币种');
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedCode, currencyCode: selectedCurrency }),
      });

      if (!response.ok) {
        void messageApi.error('语言添加失败');
        return;
      }

      resetAddModal();
      await reloadRows();
      void messageApi.success('语言已添加');
    });
  }

  function saveCurrency() {
    if (!editingRow) {
      return;
    }

    if (!editingCurrency) {
      void messageApi.warning('请选择币种');
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/languages/${encodeURIComponent(editingRow.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencyCode: editingCurrency }),
      });

      if (!response.ok) {
        void messageApi.error('币种更新失败');
        return;
      }

      resetEditModal();
      await reloadRows();
      void messageApi.success('币种已更新');
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
            管理当前站点启用的语言种类；添加语言时从预设常用语言和小语种枚举中选择，并为每种语言配置币种。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          添加语言
        </Button>
      </Space>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索代码、语言名、地区、币种或国家代码"
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
          tableLayout="fixed"
          style={{ width: '100%' }}
          scroll={adminTableScroll(1380)}
          columns={[
            {
              title: '语言',
              key: 'language',
              width: 148,
              onHeaderCell: adminTableNowrapHeader,
              render: (_, row: AdminSiteLanguageRow) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>{row.name}</Typography.Text>
                  <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{row.nativeName}</Typography.Text>
                </Space>
              ),
            },
            {
              title: '代码',
              dataIndex: 'code',
              width: 88,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: '地区',
              dataIndex: 'region',
              width: 168,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '币种',
              dataIndex: 'currencyCode',
              width: 196,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => (
                <Tag color="green" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatCurrencyLabel(value)}
                </Tag>
              ),
            },
            {
              title: '书写方向',
              dataIndex: 'direction',
              width: 96,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: AdminSiteLanguageRow['direction']) => <Tag color={value === 'rtl' ? 'purple' : 'blue'}>{value.toUpperCase()}</Tag>,
            },
            {
              title: '国家/地区',
              dataIndex: 'countryCodes',
              width: 168,
              onHeaderCell: adminTableNowrapHeader,
              render: (values: string[]) => (
                <Space size={4} wrap={false} style={{ maxWidth: '100%', overflow: 'hidden' }}>
                  {values.length ? values.map((value) => <Tag key={value}>{value}</Tag>) : <Typography.Text type="secondary">未设置</Typography.Text>}
                </Space>
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 88,
              onHeaderCell: adminTableNowrapHeader,
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
              width: 116,
              onHeaderCell: adminTableNowrapHeader,
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
              width: 96,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: number, row: AdminSiteLanguageRow) => (
                <InputNumber min={0} value={value} onChange={(next) => updateLanguage(row.code, { sortOrder: Number(next ?? 0) })} />
              ),
            },
            {
              title: '操作',
              key: 'actions',
              width: 72,
              fixed: 'right',
              onHeaderCell: adminTableNowrapHeader,
              render: (_, row: AdminSiteLanguageRow) => (
                <Space size={0} className="admin-row-actions">
                  <AdminActionIconButton title="编辑币种" icon={<EditOutlined />} onClick={() => openEditModal(row)} />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title="添加站点语言"
        onCancel={resetAddModal}
        onOk={addLanguage}
        confirmLoading={isPending}
        okText="添加"
        okButtonProps={{ disabled: !selectedCode || !selectedCurrency }}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="语言" required>
            <Select
              showSearch
              allowClear
              value={selectedCode}
              options={languageOptions}
              optionFilterProp="label"
              placeholder="选择语言，如 French / Français (fr)"
              onChange={handleLanguageChange}
              style={{ width: '100%' }}
              suffixIcon={<GlobalOutlined />}
            />
          </Form.Item>
          <Form.Item label="币种" required>
            <Select
              showSearch
              value={selectedCurrency}
              options={currencyOptions}
              optionFilterProp="label"
              placeholder="选择币种，如 USD — US Dollar"
              onChange={(value) => setSelectedCurrency(value)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            选择语言后将按内置默认关联自动带出币种，可按需修改。
          </Typography.Paragraph>
        </Form>
      </Modal>

      <Modal
        open={editOpen}
        title="编辑币种"
        onCancel={resetEditModal}
        onOk={saveCurrency}
        confirmLoading={isPending}
        okText="保存"
        okButtonProps={{ disabled: !editingCurrency }}
        destroyOnHidden
      >
        {editingRow ? (
          <Form layout="vertical">
            <Form.Item label="语言">
              <Typography.Text>
                {editingRow.name} / {editingRow.nativeName} ({editingRow.code})
              </Typography.Text>
            </Form.Item>
            <Form.Item label="币种" required>
              <Select
                showSearch
                value={editingCurrency}
                options={currencyOptions}
                optionFilterProp="label"
                placeholder="选择币种"
                onChange={(value) => setEditingCurrency(value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </Space>
  );
}
