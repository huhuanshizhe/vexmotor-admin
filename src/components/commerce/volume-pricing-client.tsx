'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { createLocalId } from '@/components/commerce/commerce-utils';
import { useCommerceConfig } from '@/components/commerce/use-commerce-config';
import type { CommerceConfig, VolumePricingRuleConfig } from '@/lib/commerce-config';

type VolumeRuleFormValues = {
  label: string;
  minQuantity: number;
  priceFactor: number;
  note: string;
  enabled: boolean;
};

export function VolumePricingClient({ initialConfig }: { initialConfig: CommerceConfig }) {
  const { config, statusMessage, isPending, updateConfig, persistConfig } = useCommerceConfig(initialConfig);
  const [volumeRuleModalOpen, setVolumeRuleModalOpen] = useState(false);
  const [editingVolumeRuleId, setEditingVolumeRuleId] = useState<string | null>(null);
  const [volumeRuleForm] = Form.useForm<VolumeRuleFormValues>();

  function openVolumeRuleModal(rule?: VolumePricingRuleConfig) {
    setEditingVolumeRuleId(rule?.id ?? null);
    volumeRuleForm.setFieldsValue({
      label: rule?.label ?? '',
      minQuantity: rule?.minQuantity ?? 1,
      priceFactor: rule?.priceFactor ?? 1,
      note: rule?.note ?? '',
      enabled: rule?.enabled ?? true,
    });
    setVolumeRuleModalOpen(true);
  }

  function saveVolumeRule() {
    void volumeRuleForm.validateFields().then((values) => {
      updateConfig((current) => {
        const nextRule: VolumePricingRuleConfig = {
          id: editingVolumeRuleId ?? createLocalId('tier'),
          label: values.label.trim(),
          minQuantity: values.minQuantity,
          priceFactor: values.priceFactor,
          note: values.note.trim() || null,
          enabled: values.enabled,
        };

        return {
          ...current,
          volumePricingRules: editingVolumeRuleId
            ? current.volumePricingRules.map((rule) => (rule.id === editingVolumeRuleId ? nextRule : rule))
            : [...current.volumePricingRules, nextRule],
        };
      });
      setVolumeRuleModalOpen(false);
      setEditingVolumeRuleId(null);
      volumeRuleForm.resetFields();
    });
  }

  function deleteVolumeRule(id: string) {
    updateConfig((current) => ({
      ...current,
      volumePricingRules: current.volumePricingRules.filter((rule) => rule.id !== id),
    }));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="阶梯定价"
        description="维护官网批量采购阶梯价规则。购物车、PDP 与 Checkout 会读取这里的配置。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={persistConfig}
      />

      <Card
        title="阶梯定价规则"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openVolumeRuleModal()}>
            新增阶梯
          </Button>
        )}
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={[...config.volumePricingRules].sort((left, right) => left.minQuantity - right.minQuantity)}
          columns={[
            { title: '名称', dataIndex: 'label' },
            { title: '起订数量', dataIndex: 'minQuantity' },
            {
              title: '价格系数',
              dataIndex: 'priceFactor',
              render: (value: number) => value.toFixed(2),
            },
            {
              title: '优惠幅度',
              dataIndex: 'priceFactor',
              render: (value: number) => `${Math.round((1 - value) * 100)}%`,
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
            },
            { title: '说明', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
            {
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: VolumePricingRuleConfig) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openVolumeRuleModal(row)} />
                  <Popconfirm title="确定删除该阶梯规则吗？" onConfirm={() => deleteVolumeRule(row.id)}>
                    <Button danger icon={<DeleteOutlined />} disabled={config.volumePricingRules.length <= 1} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={volumeRuleModalOpen}
        title={editingVolumeRuleId ? '编辑阶梯规则' : '新增阶梯规则'}
        onCancel={() => {
          setVolumeRuleModalOpen(false);
          setEditingVolumeRuleId(null);
        }}
        onOk={saveVolumeRule}
        destroyOnHidden
      >
        <Form form={volumeRuleForm} layout="vertical" initialValues={{ enabled: true, minQuantity: 1, priceFactor: 1, note: '' }}>
          <Form.Item label="名称" name="label" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="起订数量" name="minQuantity" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="价格系数" name="priceFactor" rules={[{ required: true }]}>
            <InputNumber min={0.01} max={1} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="说明" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
